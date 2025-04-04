"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../db/config"));
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
        // Check if user exists
        const { rows } = await config_1.default.query("SELECT id FROM users WHERE id = $1", [
            decoded.userId,
        ]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "User not found" });
        }
        // Add user to request
        req.user = { id: decoded.userId };
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};
exports.auth = auth;
