import express from "express"
import { body } from "express-validator"
import { getProductReviews, addReview, deleteReview } from "../controllers/review.controller"
import { auth } from "../middleware/auth"

const router = express.Router()

// Get reviews for a product (public)
router.get("/product/:productId", getProductReviews)

// Add a review (requires auth)
router.post(
  "/product/:productId",
  [
    auth,
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("reviewText").optional().isString().withMessage("Review text must be a string"),
  ],
  addReview,
)

// Delete a review (requires auth)
router.delete("/:reviewId", auth, deleteReview)

export default router

