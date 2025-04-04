import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../db/config";

interface DecodedToken {
  userId: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key"
    ) as DecodedToken;

    // Check if user exists
    const { rows } = await pool.query("SELECT id FROM users WHERE id = $1", [
      decoded.userId,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    // Add user to request
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
