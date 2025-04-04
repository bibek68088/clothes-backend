"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.addReview = exports.getProductReviews = void 0;
const config_1 = __importDefault(require("../db/config"));
// Get reviews for a product
const getProductReviews = async (req, res) => {
    const { productId } = req.params;
    try {
        const query = `
      SELECT pr.id, pr.rating, pr.review_text, pr.created_at, 
             u.id as user_id, u.name as user_name
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = $1
      ORDER BY pr.created_at DESC
    `;
        const { rows } = await config_1.default.query(query, [productId]);
        res.status(200).json({ reviews: rows });
    }
    catch (error) {
        console.error("Get reviews error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProductReviews = getProductReviews;
// Add a review
const addReview = async (req, res) => {
    const { productId } = req.params;
    const { rating, reviewText } = req.body;
    const userId = req.user?.id;
    try {
        const client = await config_1.default.connect();
        try {
            await client.query("BEGIN");
            // Check if user has already reviewed this product
            const existingReview = await client.query("SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2", [productId, userId]);
            if (existingReview.rows.length > 0) {
                // Update existing review
                await client.query("UPDATE product_reviews SET rating = $1, review_text = $2, updated_at = CURRENT_TIMESTAMP WHERE product_id = $3 AND user_id = $4", [rating, reviewText, productId, userId]);
            }
            else {
                // Add new review
                await client.query("INSERT INTO product_reviews (product_id, user_id, rating, review_text) VALUES ($1, $2, $3, $4)", [productId, userId, rating, reviewText]);
            }
            // Update product average rating and review count
            await client.query(`
        UPDATE products 
        SET 
          average_rating = (
            SELECT AVG(rating) FROM product_reviews WHERE product_id = $1
          ),
          review_count = (
            SELECT COUNT(*) FROM product_reviews WHERE product_id = $1
          )
        WHERE id = $1
      `, [productId]);
            await client.query("COMMIT");
            res.status(201).json({ message: "Review added successfully" });
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
        console.error("Add review error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addReview = addReview;
// Delete a review
const deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user?.id;
    try {
        const client = await config_1.default.connect();
        try {
            await client.query("BEGIN");
            // Get the product ID for the review
            const reviewResult = await client.query("SELECT product_id FROM product_reviews WHERE id = $1 AND user_id = $2", [
                reviewId,
                userId,
            ]);
            if (reviewResult.rows.length === 0) {
                return res.status(404).json({ message: "Review not found or not authorized" });
            }
            const productId = reviewResult.rows[0].product_id;
            // Delete the review
            await client.query("DELETE FROM product_reviews WHERE id = $1", [reviewId]);
            // Update product average rating and review count
            await client.query(`
        UPDATE products 
        SET 
          average_rating = (
            SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = $1
          ),
          review_count = (
            SELECT COUNT(*) FROM product_reviews WHERE product_id = $1
          )
        WHERE id = $1
      `, [productId]);
            await client.query("COMMIT");
            res.status(200).json({ message: "Review deleted successfully" });
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
        console.error("Delete review error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteReview = deleteReview;
