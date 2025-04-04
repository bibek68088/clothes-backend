import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { errorHandler } from "./middleware/errorHandler"
import authRoutes from "./routes/auth.routes"
import productRoutes from "./routes/product.routes"
import cartRoutes from "./routes/cart.routes"
import orderRoutes from "./routes/order.routes"

// Load environment variables
dotenv.config()

// Initialize express app
const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

