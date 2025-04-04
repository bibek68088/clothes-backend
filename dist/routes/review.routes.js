"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const review_controller_1 = require("../controllers/review.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get reviews for a product (public)
router.get("/product/:productId", review_controller_1.getProductReviews);
// Add a review (requires auth)
router.post("/product/:productId", [
    auth_1.auth,
    (0, express_validator_1.body)("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("reviewText").optional().isString().withMessage("Review text must be a string"),
], review_controller_1.addReview);
// Delete a review (requires auth)
router.delete("/:reviewId", auth_1.auth, review_controller_1.deleteReview);
exports.default = router;
