import type { Request, Response, NextFunction } from "express"
import pool from "../db/config"

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" })
    }

    // Check if user is an admin
    const { rows } = await pool.query("SELECT role FROM users WHERE id = $1", [userId])

    if (rows.length === 0 || rows[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    next()
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
}

