import express from "express"
import { body } from "express-validator"
import { getWishlist, addToWishlist, removeFromWishlist, checkWishlistItem } from "../controllers/wishlist.controller"
import { auth } from "../middleware/auth"

const router = express.Router()

// All wishlist routes require authentication
router.use(auth)

// Get user's wishlist
router.get("/", getWishlist)

// Add item to wishlist
router.post("/", [body("productId").notEmpty().withMessage("Product ID is required")], addToWishlist)

// Remove item from wishlist
router.delete("/:id", removeFromWishlist)

// Check if product is in wishlist
router.get("/check/:productId", checkWishlistItem)

export default router

