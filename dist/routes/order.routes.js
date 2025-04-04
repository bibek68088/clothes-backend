"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const order_controller_1 = require("../controllers/order.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All order routes require authentication
router.use(auth_1.auth);
// Create order
router.post("/", [
    (0, express_validator_1.body)("addressId").notEmpty().withMessage("Address ID is required"),
    (0, express_validator_1.body)("paymentMethod").isIn(["card", "paypal"]).withMessage("Valid payment method is required"),
], order_controller_1.createOrder);
// Get user orders
router.get("/", order_controller_1.getUserOrders);
// Get order by ID
router.get("/:id", order_controller_1.getOrderById);
// Process payment
router.post("/payment", [
    (0, express_validator_1.body)("paymentIntentId").notEmpty().withMessage("Payment intent ID is required"),
    (0, express_validator_1.body)("paymentMethodId").notEmpty().withMessage("Payment method ID is required"),
], order_controller_1.processPayment);
exports.default = router;
