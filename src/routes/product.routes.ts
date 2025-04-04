import express from "express"
import { getAllProducts, getProductById, getCategories } from "../controllers/product.controller"

const router = express.Router()

// Get all products
router.get("/", getAllProducts)

// Get product by ID
router.get("/:id", getProductById)

// Get product categories
router.get("/categories/all", getCategories)

export default router

