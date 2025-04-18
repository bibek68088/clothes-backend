"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPayment = exports.getOrderById = exports.getUserOrders = exports.createOrder = void 0;
const config_1 = __importDefault(require("../db/config"));
const uuid_1 = require("uuid");
const stripe_1 = __importDefault(require("stripe"));
const email_service_1 = require("../services/email.service");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
});
// Create order
const createOrder = async (req, res) => {
    const userId = req.user?.id || null;
    const { addressId, paymentMethod } = req.body;
    try {
        // Start transaction
        const client = await config_1.default.connect();
        try {
            await client.query("BEGIN");
            // Check if address exists and belongs to user
            const addressResult = await client.query("SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2", [
                addressId,
                userId,
            ]);
            if (addressResult.rows.length === 0) {
                return res.status(404).json({ message: "Address not found" });
            }
            // Get cart items
            const cartQuery = `
        SELECT ci.product_id, ci.quantity, ci.selected_options,
               p.name, p.price, p.stock_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1
      `;
            const cartResult = await client.query(cartQuery, [userId]);
            if (cartResult.rows.length === 0) {
                return res.status(400).json({ message: "Cart is empty" });
            }
            // Calculate total amount and check stock
            let totalAmount = 0;
            const cartItems = cartResult.rows;
            for (const item of cartItems) {
                if (item.stock_quantity < item.quantity) {
                    return res.status(400).json({
                        message: `Not enough stock for ${item.name}`,
                        availableStock: item.stock_quantity,
                    });
                }
                totalAmount += Number.parseFloat(item.price) * item.quantity;
            }
            // Create payment intent with Stripe
            let paymentIntentId = null;
            if (paymentMethod === "card") {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(totalAmount * 100), // Convert to cents
                    currency: "usd",
                    metadata: {
                        userId,
                    },
                });
                paymentIntentId = paymentIntent.id;
            }
            // Create order
            const orderId = (0, uuid_1.v4)();
            const orderResult = await client.query(`INSERT INTO orders (id, user_id, status, total_amount, shipping_address_id, payment_intent_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [orderId, userId, "pending", totalAmount, addressId, paymentIntentId]);
            const order = orderResult.rows[0];
            // Create order items and update stock
            for (const item of cartItems) {
                // Create order item
                await client.query(`INSERT INTO order_items (order_id, product_id, quantity, price, selected_options)
           VALUES ($1, $2, $3, $4, $5)`, [orderId, item.product_id, item.quantity, item.price, item.selected_options]);
                // Update product stock
                await client.query("UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2", [
                    item.quantity,
                    item.product_id,
                ]);
            }
            // Clear cart
            await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
            await client.query("COMMIT");
            // Get user email
            const userResult = await client.query("SELECT email FROM users WHERE id = $1", [userId]);
            const userEmail = userResult.rows[0].email;
            // Send order confirmation email
            const orderWithItems = {
                ...order,
                items: cartItems.map((item) => ({
                    product: {
                        name: item.name,
                    },
                    quantity: item.quantity,
                    price: Number.parseFloat(item.price),
                    selected_options: item.selected_options,
                })),
            };
            await (0, email_service_1.sendEmail)(userEmail, "orderConfirmation", orderWithItems);
            res.status(201).json({
                message: "Order created successfully",
                order: {
                    id: order.id,
                    status: order.status,
                    totalAmount: Number.parseFloat(order.total_amount),
                    createdAt: order.created_at,
                    paymentIntentId: order.payment_intent_id,
                },
            });
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.createOrder = createOrder;
// Get user orders
const getUserOrders = async (req, res) => {
    const userId = req.user?.id;
    try {
        // Get orders
        const ordersQuery = `
      SELECT o.*, a.street, a.city, a.state, a.zip_code, a.country
      FROM orders o
      LEFT JOIN user_addresses a ON o.shipping_address_id = a.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `;
        const ordersResult = await config_1.default.query(ordersQuery, [userId]);
        const orders = ordersResult.rows;
        // Get order items for each order
        const orderIds = orders.map((order) => order.id);
        if (orderIds.length > 0) {
            const itemsQuery = `
        SELECT oi.*, p.name, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ANY($1::uuid[])
      `;
            const itemsResult = await config_1.default.query(itemsQuery, [orderIds]);
            const items = itemsResult.rows;
            // Group items by order
            const itemsByOrder = items.reduce((acc, item) => {
                if (!acc[item.order_id]) {
                    acc[item.order_id] = [];
                }
                acc[item.order_id].push({
                    id: item.id,
                    product: {
                        id: item.product_id,
                        name: item.name,
                        image: item.image_url,
                    },
                    quantity: item.quantity,
                    price: Number.parseFloat(item.price),
                    selectedOptions: item.selected_options,
                });
                return acc;
            }, {});
            // Add items to orders
            orders.forEach((order) => {
                order.items = itemsByOrder[order.id] || [];
                order.total_amount = Number.parseFloat(order.total_amount);
                // Format address
                order.shippingAddress = {
                    street: order.street,
                    city: order.city,
                    state: order.state,
                    zipCode: order.zip_code,
                    country: order.country,
                };
                // Remove redundant fields
                delete order.street;
                delete order.city;
                delete order.state;
                delete order.zip_code;
                delete order.country;
            });
        }
        res.status(200).json({ orders });
    }
    catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserOrders = getUserOrders;
// Get order by ID
const getOrderById = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    try {
        // Get order
        const orderQuery = `
      SELECT o.*, a.street, a.city, a.state, a.zip_code, a.country
      FROM orders o
      LEFT JOIN user_addresses a ON o.shipping_address_id = a.id
      WHERE o.id = $1 AND o.user_id = $2
    `;
        const orderResult = await config_1.default.query(orderQuery, [id, userId]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        const order = orderResult.rows[0];
        // Get order items
        const itemsQuery = `
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
        const itemsResult = await config_1.default.query(itemsQuery, [id]);
        const items = itemsResult.rows.map((item) => ({
            id: item.id,
            product: {
                id: item.product_id,
                name: item.name,
                image: item.image_url,
            },
            quantity: item.quantity,
            price: Number.parseFloat(item.price),
            selectedOptions: item.selected_options,
        }));
        // Format response
        const formattedOrder = {
            id: order.id,
            status: order.status,
            totalAmount: Number.parseFloat(order.total_amount),
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            paymentIntentId: order.payment_intent_id,
            shippingAddress: {
                street: order.street,
                city: order.city,
                state: order.state,
                zipCode: order.zip_code,
                country: order.country,
            },
            items,
        };
        res.status(200).json({ order: formattedOrder });
    }
    catch (error) {
        console.error("Get order error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getOrderById = getOrderById;
// Process payment
const processPayment = async (req, res) => {
    const { paymentIntentId, paymentMethodId } = req.body;
    try {
        // Attach payment method to payment intent
        await stripe.paymentIntents.update(paymentIntentId, {
            payment_method: paymentMethodId,
        });
        // Confirm payment
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        // Update order status if payment successful
        if (paymentIntent.status === "succeeded") {
            await config_1.default.query("UPDATE orders SET status = $1 WHERE payment_intent_id = $2", ["processing", paymentIntentId]);
            res.status(200).json({
                success: true,
                message: "Payment processed successfully",
                paymentIntent,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "Payment processing failed",
                status: paymentIntent.status,
            });
        }
    }
    catch (error) {
        console.error("Process payment error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.processPayment = processPayment;
