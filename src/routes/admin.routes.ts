import express from "express"
import { body } from "express-validator"
import {
  getDashboardStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/admin.controller"
import { auth } from "../middleware/auth"
import { adminOnly } from "../middleware/admin"

const router = express.Router()

// All admin routes require authentication and admin role
router.use(auth, adminOnly)

// Dashboard
router.get("/dashboard", getDashboardStats)

// User management
router.get("/users", getAllUsers)
router.post(
  "/users",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").isIn(["admin", "customer"]).withMessage("Role must be either admin or customer"),
  ],
  createUser,
)
router.put("/users/:id", updateUser)
router.delete("/users/:id", deleteUser)

// Product management
router.post(
  "/products",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("price").isNumeric().withMessage("Price must be a number"),
    body("stock_quantity").isInt({ min: 0 }).withMessage("Stock quantity must be a non-negative integer"),
  ],
  createProduct,
)
router.put("/products/:id", updateProduct)
router.delete("/products/:id", deleteProduct)

// Order management
router.get("/orders", getAllOrders)
router.put(
  "/orders/:id/status",
  [
    body("status")
      .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Status must be valid"),
  ],
  updateOrderStatus,
)

export default router

