import express from "express"
import { body } from "express-validator"
import { createOrder, getUserOrders, getOrderById, processPayment } from "../controllers/order.controller"
import { auth } from "../middleware/auth"

const router = express.Router()

// All order routes require authentication
router.use(auth)

// Create order
router.post(
  "/",
  [
    body("addressId").notEmpty().withMessage("Address ID is required"),
    body("paymentMethod").isIn(["card", "paypal"]).withMessage("Valid payment method is required"),
  ],
  createOrder,
)

// Get user orders
router.get("/", getUserOrders)

// Get order by ID
router.get("/:id", getOrderById)

// Process payment
router.post(
  "/payment",
  [
    body("paymentIntentId").notEmpty().withMessage("Payment intent ID is required"),
    body("paymentMethodId").notEmpty().withMessage("Payment method ID is required"),
  ],
  processPayment,
)

export default router

