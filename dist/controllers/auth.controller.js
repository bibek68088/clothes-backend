"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddress = exports.updateAddress = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../db/config"));
const uuid_1 = require("uuid");
// Register a new user
const register = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        // Check if user already exists
        const existingUser = await config_1.default.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create user
        const userId = (0, uuid_1.v4)();
        const result = await config_1.default.query("INSERT INTO users (id, name, email, password, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, created_at", [userId, name, email, hashedPassword, phone]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret_key", { expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "604800") } // Convert to number (seconds)
        );
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at,
            },
            token,
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if user exists
        const result = await config_1.default.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = result.rows[0];
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Get user address
        const addressResult = await config_1.default.query("SELECT * FROM user_addresses WHERE user_id = $1 AND is_default = true", [user.id]);
        const address = addressResult.rows[0] || null;
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || "fallback_secret_key", { expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "604800") } // Convert to number (seconds)
        );
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: address
                    ? {
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zipCode: address.zip_code,
                        country: address.country,
                    }
                    : null,
                created_at: user.created_at,
            },
            token,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get user data
        const userResult = await config_1.default.query("SELECT id, name, email, phone, created_at FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = userResult.rows[0];
        // Get user addresses
        const addressResult = await config_1.default.query("SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC", [userId]);
        const addresses = addressResult.rows.map((addr) => ({
            id: addr.id,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zip_code,
            country: addr.country,
            isDefault: addr.is_default,
        }));
        res.status(200).json({
            user: {
                ...user,
                addresses,
            },
        });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    const { name, email, phone } = req.body;
    const userId = req.user?.id;
    try {
        // Update user
        const result = await config_1.default.query("UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING id, name, email, phone, created_at", [name, email, phone, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = result.rows[0];
        res.status(200).json({
            message: "Profile updated successfully",
            user,
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProfile = updateProfile;
// Add or update user address
const updateAddress = async (req, res) => {
    const { street, city, state, zipCode, country, isDefault } = req.body;
    const userId = req.user?.id;
    const addressId = req.params.addressId;
    try {
        let result;
        // If isDefault is true, set all other addresses to not default
        if (isDefault) {
            await config_1.default.query("UPDATE user_addresses SET is_default = false WHERE user_id = $1", [userId]);
        }
        if (addressId === "new") {
            // Create new address
            result = await config_1.default.query("INSERT INTO user_addresses (user_id, street, city, state, zip_code, country, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [userId, street, city, state, zipCode, country, isDefault]);
        }
        else {
            // Update existing address
            result = await config_1.default.query("UPDATE user_addresses SET street = $1, city = $2, state = $3, zip_code = $4, country = $5, is_default = $6 WHERE id = $7 AND user_id = $8 RETURNING *", [street, city, state, zipCode, country, isDefault, addressId, userId]);
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Address not found" });
        }
        const address = result.rows[0];
        res.status(200).json({
            message: "Address updated successfully",
            address: {
                id: address.id,
                street: address.street,
                city: address.city,
                state: address.state,
                zipCode: address.zip_code,
                country: address.country,
                isDefault: address.is_default,
            },
        });
    }
    catch (error) {
        console.error("Update address error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateAddress = updateAddress;
// Delete user address
const deleteAddress = async (req, res) => {
    const userId = req.user?.id;
    const addressId = req.params.addressId;
    try {
        const result = await config_1.default.query("DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *", [addressId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Address not found" });
        }
        res.status(200).json({
            message: "Address deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete address error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteAddress = deleteAddress;
