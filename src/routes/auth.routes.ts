import express from "express"
import { body } from "express-validator"
import {
  register,
  login,
  getProfile,
  updateProfile,
  updateAddress,
  deleteAddress,
} from "../controllers/auth.controller"
import { auth } from "../middleware/auth"

const router = express.Router()

// Register user
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  register,
)

// Login user
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  login,
)

// Get user profile
router.get("/profile", auth, getProfile)

// Update user profile
router.put(
  "/profile",
  [
    auth,
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
  ],
  updateProfile,
)

// Add or update address
router.put(
  "/address/:addressId",
  [
    auth,
    body("street").notEmpty().withMessage("Street is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
    body("zipCode").notEmpty().withMessage("Zip code is required"),
    body("country").notEmpty().withMessage("Country is required"),
  ],
  updateAddress,
)

// Delete address
router.delete("/address/:addressId", auth, deleteAddress)

export default router

