import express from "express"
import { body } from "express-validator"
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cart.controller"
import { auth } from "../middleware/auth"

const router = express.Router()

// All cart routes require authentication
router.use(auth)

// Get user's cart
router.get("/", getCart)

// Add item to cart
router.post(
  "/",
  [
    body("productId").notEmpty().withMessage("Product ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  addToCart,
)

// Update cart item quantity
router.put("/:id", [body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1")], updateCartItem)

// Remove item from cart
router.delete("/:id", removeFromCart)

// Clear cart
router.delete("/", clearCart)

export default router

