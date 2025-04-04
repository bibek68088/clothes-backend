"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All wishlist routes require authentication
router.use(auth_1.auth);
// Get user's wishlist
router.get("/", wishlist_controller_1.getWishlist);
// Add item to wishlist
router.post("/", [(0, express_validator_1.body)("productId").notEmpty().withMessage("Product ID is required")], wishlist_controller_1.addToWishlist);
// Remove item from wishlist
router.delete("/:id", wishlist_controller_1.removeFromWishlist);
// Check if product is in wishlist
router.get("/check/:productId", wishlist_controller_1.checkWishlistItem);
exports.default = router;
