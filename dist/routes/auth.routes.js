"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Register user
router.post("/register", [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Please include a valid email"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
], auth_controller_1.register);
// Login user
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please include a valid email"),
    (0, express_validator_1.body)("password").exists().withMessage("Password is required"),
], auth_controller_1.login);
// Get user profile
router.get("/profile", auth_1.auth, auth_controller_1.getProfile);
// Update user profile
router.put("/profile", [
    auth_1.auth,
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Please include a valid email"),
], auth_controller_1.updateProfile);
// Add or update address
router.put("/address/:addressId", [
    auth_1.auth,
    (0, express_validator_1.body)("street").notEmpty().withMessage("Street is required"),
    (0, express_validator_1.body)("city").notEmpty().withMessage("City is required"),
    (0, express_validator_1.body)("state").notEmpty().withMessage("State is required"),
    (0, express_validator_1.body)("zipCode").notEmpty().withMessage("Zip code is required"),
    (0, express_validator_1.body)("country").notEmpty().withMessage("Country is required"),
], auth_controller_1.updateAddress);
// Delete address
router.delete("/address/:addressId", auth_1.auth, auth_controller_1.deleteAddress);
exports.default = router;
