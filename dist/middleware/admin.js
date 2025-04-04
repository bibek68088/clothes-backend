"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const config_1 = __importDefault(require("../db/config"));
const adminOnly = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Check if user is an admin
        const { rows } = await config_1.default.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (rows.length === 0 || rows[0].role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }
        next();
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.adminOnly = adminOnly;
