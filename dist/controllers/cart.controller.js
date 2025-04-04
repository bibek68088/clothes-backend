"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const config_1 = __importDefault(require("../db/config"));
const uuid_1 = require("uuid");
// Get user's cart
const getCart = async (req, res) => {
    const userId = req.user?.id;
    try {
        // Get cart items with product details
        const query = `
      SELECT ci.id, ci.quantity, ci.selected_options,
             p.id as product_id, p.name, p.price, p.image_url, p.description
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `;
        const { rows } = await config_1.default.query(query, [userId]);
        // Format cart items
        const cartItems = rows.map((item) => ({
            id: item.id,
            product: {
                id: item.product_id,
                name: item.name,
                price: Number.parseFloat(item.price),
                image: item.image_url,
                description: item.description,
            },
            quantity: item.quantity,
            selectedColor: item.selected_options?.color || null,
            selectedSize: item.selected_options?.size || null,
        }));
        res.status(200).json({ cartItems });
    }
    catch (error) {
        console.error("Get cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getCart = getCart;
// Add item to cart
const addToCart = async (req, res) => {
    const userId = req.user?.id;
    const { productId, quantity = 1, color, size } = req.body;
    try {
        // Check if product exists
        const productResult = await config_1.default.query("SELECT * FROM products WHERE id = $1", [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if product is in stock
        const product = productResult.rows[0];
        if (product.stock_quantity < quantity) {
            return res.status(400).json({ message: "Not enough stock available" });
        }
        // Check if item already exists in cart
        const selectedOptions = { color, size };
        const existingItemQuery = `
      SELECT * FROM cart_items 
      WHERE user_id = $1 AND product_id = $2 AND selected_options @> $3::jsonb
    `;
        const existingItemResult = await config_1.default.query(existingItemQuery, [userId, productId, JSON.stringify(selectedOptions)]);
        if (existingItemResult.rows.length > 0) {
            // Update quantity of existing item
            const existingItem = existingItemResult.rows[0];
            const newQuantity = existingItem.quantity + quantity;
            await config_1.default.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [newQuantity, existingItem.id]);
            return res.status(200).json({
                message: "Cart updated successfully",
                cartItem: {
                    id: existingItem.id,
                    product: {
                        id: product.id,
                        name: product.name,
                        price: Number.parseFloat(product.price),
                        image: product.image_url,
                    },
                    quantity: newQuantity,
                    selectedColor: color || null,
                    selectedSize: size || null,
                },
            });
        }
        // Add new item to cart
        const cartItemId = (0, uuid_1.v4)();
        await config_1.default.query("INSERT INTO cart_items (id, user_id, product_id, quantity, selected_options) VALUES ($1, $2, $3, $4, $5)", [cartItemId, userId, productId, quantity, JSON.stringify(selectedOptions)]);
        res.status(201).json({
            message: "Item added to cart",
            cartItem: {
                id: cartItemId,
                product: {
                    id: product.id,
                    name: product.name,
                    price: Number.parseFloat(product.price),
                    image: product.image_url,
                },
                quantity,
                selectedColor: color || null,
                selectedSize: size || null,
            },
        });
    }
    catch (error) {
        console.error("Add to cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addToCart = addToCart;
// Update cart item quantity
const updateCartItem = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { quantity } = req.body;
    try {
        // Check if cart item exists and belongs to user
        const cartItemResult = await config_1.default.query("SELECT * FROM cart_items WHERE id = $1 AND user_id = $2", [id, userId]);
        if (cartItemResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        // Update quantity
        await config_1.default.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [quantity, id]);
        res.status(200).json({
            message: "Cart item updated",
            cartItem: {
                id,
                quantity,
            },
        });
    }
    catch (error) {
        console.error("Update cart item error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateCartItem = updateCartItem;
// Remove item from cart
const removeFromCart = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    try {
        // Check if cart item exists and belongs to user
        const result = await config_1.default.query("DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *", [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }
        res.status(200).json({
            message: "Item removed from cart",
        });
    }
    catch (error) {
        console.error("Remove from cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeFromCart = removeFromCart;
// Clear cart
const clearCart = async (req, res) => {
    const userId = req.user?.id;
    try {
        await config_1.default.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
        res.status(200).json({
            message: "Cart cleared",
        });
    }
    catch (error) {
        console.error("Clear cart error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.clearCart = clearCart;
