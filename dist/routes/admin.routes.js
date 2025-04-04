"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const router = express_1.default.Router();
// All admin routes require authentication and admin role
router.use(auth_1.auth, admin_1.adminOnly);
// Dashboard
router.get("/dashboard", admin_controller_1.getDashboardStats);
// User management
router.get("/users", admin_controller_1.getAllUsers);
router.post("/users", [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Please include a valid email"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("role").isIn(["admin", "customer"]).withMessage("Role must be either admin or customer"),
], admin_controller_1.createUser);
router.put("/users/:id", admin_controller_1.updateUser);
router.delete("/users/:id", admin_controller_1.deleteUser);
// Product management
router.post("/products", [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("price").isNumeric().withMessage("Price must be a number"),
    (0, express_validator_1.body)("stock_quantity").isInt({ min: 0 }).withMessage("Stock quantity must be a non-negative integer"),
], admin_controller_1.createProduct);
router.put("/products/:id", admin_controller_1.updateProduct);
router.delete("/products/:id", admin_controller_1.deleteProduct);
// Order management
router.get("/orders", admin_controller_1.getAllOrders);
router.put("/orders/:id/status", [
    (0, express_validator_1.body)("status")
        .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
        .withMessage("Status must be valid"),
], admin_controller_1.updateOrderStatus);
exports.default = router;
