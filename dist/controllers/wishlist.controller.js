"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWishlistItem = exports.removeFromWishlist = exports.addToWishlist = exports.getWishlist = void 0;
const config_1 = __importDefault(require("../db/config"));
const uuid_1 = require("uuid");
// Get user's wishlist
const getWishlist = async (req, res) => {
    const userId = req.user?.id;
    try {
        const query = `
      SELECT wi.id, wi.created_at,
             p.id as product_id, p.name, p.price, p.image_url, p.description, p.average_rating, p.review_count
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      WHERE wi.user_id = $1
      ORDER BY wi.created_at DESC
    `;
        const { rows } = await config_1.default.query(query, [userId]);
        // Format wishlist items
        const wishlistItems = rows.map((item) => ({
            id: item.id,
            product: {
                id: item.product_id,
                name: item.name,
                price: Number.parseFloat(item.price),
                image: item.image_url,
                description: item.description,
                averageRating: item.average_rating ? Number.parseFloat(item.average_rating) : null,
                reviewCount: item.review_count,
            },
            createdAt: item.created_at,
        }));
        res.status(200).json({ wishlistItems });
    }
    catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getWishlist = getWishlist;
// Add item to wishlist
const addToWishlist = async (req, res) => {
    const userId = req.user?.id;
    const { productId } = req.body;
    try {
        // Check if product exists
        const productResult = await config_1.default.query("SELECT * FROM products WHERE id = $1", [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if item already exists in wishlist
        const existingItemResult = await config_1.default.query("SELECT * FROM wishlist_items WHERE user_id = $1 AND product_id = $2", [
            userId,
            productId,
        ]);
        if (existingItemResult.rows.length > 0) {
            return res.status(400).json({ message: "Item already in wishlist" });
        }
        // Add new item to wishlist
        const wishlistItemId = (0, uuid_1.v4)();
        await config_1.default.query("INSERT INTO wishlist_items (id, user_id, product_id) VALUES ($1, $2, $3)", [
            wishlistItemId,
            userId,
            productId,
        ]);
        const product = productResult.rows[0];
        res.status(201).json({
            message: "Item added to wishlist",
            wishlistItem: {
                id: wishlistItemId,
                product: {
                    id: product.id,
                    name: product.name,
                    price: Number.parseFloat(product.price),
                    image: product.image_url,
                    description: product.description,
                    averageRating: product.average_rating ? Number.parseFloat(product.average_rating) : null,
                    reviewCount: product.review_count,
                },
            },
        });
    }
    catch (error) {
        console.error("Add to wishlist error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addToWishlist = addToWishlist;
// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    try {
        // Check if wishlist item exists and belongs to user
        const result = await config_1.default.query("DELETE FROM wishlist_items WHERE id = $1 AND user_id = $2 RETURNING *", [
            id,
            userId,
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Wishlist item not found" });
        }
        res.status(200).json({
            message: "Item removed from wishlist",
        });
    }
    catch (error) {
        console.error("Remove from wishlist error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.removeFromWishlist = removeFromWishlist;
// Check if product is in wishlist
const checkWishlistItem = async (req, res) => {
    const userId = req.user?.id;
    const { productId } = req.params;
    try {
        const result = await config_1.default.query("SELECT * FROM wishlist_items WHERE user_id = $1 AND product_id = $2", [
            userId,
            productId,
        ]);
        const isInWishlist = result.rows.length > 0;
        const wishlistItemId = isInWishlist ? result.rows[0].id : null;
        res.status(200).json({
            isInWishlist,
            wishlistItemId,
        });
    }
    catch (error) {
        console.error("Check wishlist item error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.checkWishlistItem = checkWishlistItem;
