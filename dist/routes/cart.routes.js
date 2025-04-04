"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All cart routes require authentication
router.use(auth_1.auth);
// Get user's cart
router.get("/", cart_controller_1.getCart);
// Add item to cart
router.post("/", [
    (0, express_validator_1.body)("productId").notEmpty().withMessage("Product ID is required"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
], cart_controller_1.addToCart);
// Update cart item quantity
router.put("/:id", [(0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1")], cart_controller_1.updateCartItem);
// Remove item from cart
router.delete("/:id", cart_controller_1.removeFromCart);
// Clear cart
router.delete("/", cart_controller_1.clearCart);
exports.default = router;
