import type { Request, Response } from "express"
import pool from "../db/config"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcryptjs"

// Dashboard stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect()

    try {
      // Get total users
      const usersResult = await client.query("SELECT COUNT(*) as total FROM users")
      const totalUsers = Number.parseInt(usersResult.rows[0].total)

      // Get total products
      const productsResult = await client.query("SELECT COUNT(*) as total FROM products")
      const totalProducts = Number.parseInt(productsResult.rows[0].total)

      // Get total orders
      const ordersResult = await client.query("SELECT COUNT(*) as total FROM orders")
      const totalOrders = Number.parseInt(ordersResult.rows[0].total)

      // Get total revenue
      const revenueResult = await client.query("SELECT SUM(total_amount) as total FROM orders")
      const totalRevenue = Number.parseFloat(revenueResult.rows[0].total || "0")

      // Get recent orders
      const recentOrdersQuery = `
        SELECT o.id, o.created_at, o.status, o.total_amount, u.name as customer_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `

      const recentOrdersResult = await client.query(recentOrdersQuery)
      const recentOrders = recentOrdersResult.rows.map((order) => ({
        ...order,
        total_amount: Number.parseFloat(order.total_amount),
      }))

      // Get top selling products
      const topProductsQuery = `
        SELECT p.id, p.name, p.image_url, COUNT(oi.id) as order_count, SUM(oi.quantity) as total_quantity
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        GROUP BY p.id, p.name, p.image_url
        ORDER BY total_quantity DESC
        LIMIT 5
      `

      const topProductsResult = await client.query(topProductsQuery)
      const topProducts = topProductsResult.rows

      res.status(200).json({
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue,
        },
        recentOrders,
        topProducts,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Get dashboard stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", search } = req.query

    let query = `
      SELECT id, name, email, phone, role, created_at
      FROM users
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC`

    // Add pagination
    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limitNum, offset)

    const { rows } = await pool.query(query, queryParams)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`
    const countParams = []

    if (search) {
      countQuery += ` AND (name ILIKE $1 OR email ILIKE $1)`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].total)

    res.status(200).json({
      users: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("Get all users error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create a new user (admin only)
export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, phone, role = "customer" } = req.body

  try {
    // Check if user already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const userId = uuidv4()
    const result = await pool.query(
      "INSERT INTO users (id, name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, role, created_at",
      [userId, name, email, hashedPassword, phone, role],
    )

    const user = result.rows[0]

    res.status(201).json({
      message: "User created successfully",
      user,
    })
  } catch (error) {
    console.error("Create user error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, email, phone, role } = req.body

  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, phone = $3, role = $4 WHERE id = $5 RETURNING id, name, email, phone, role, created_at",
      [name, email, phone, role, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "User updated successfully",
      user: result.rows[0],
    })
  } catch (error) {
    console.error("Update user error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create a new product (admin only)
export const createProduct = async (req: Request, res: Response) => {
  const { name, description, price, stock_quantity, image_url, category_id, colors, sizes } = req.body

  try {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Create product
      const productId = uuidv4()
      const productResult = await client.query(
        `INSERT INTO products 
         (id, name, description, price, stock_quantity, image_url, category_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [productId, name, description, price, stock_quantity, image_url, category_id],
      )

      const product = productResult.rows[0]

      // Add product options (colors)
      if (colors && colors.length > 0) {
        for (const color of colors) {
          await client.query(
            "INSERT INTO product_options (product_id, option_type, option_value) VALUES ($1, $2, $3)",
            [productId, "color", color],
          )
        }
      }

      // Add product options (sizes)
      if (sizes && sizes.length > 0) {
        for (const size of sizes) {
          await client.query(
            "INSERT INTO product_options (product_id, option_type, option_value) VALUES ($1, $2, $3)",
            [productId, "size", size],
          )
        }
      }

      await client.query("COMMIT")

      // Format response
      product.price = Number.parseFloat(product.price)
      product.colors = colors || []
      product.sizes = sizes || []

      res.status(201).json({
        message: "Product created successfully",
        product,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update product (admin only)
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, description, price, stock_quantity, image_url, category_id, colors, sizes } = req.body

  try {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Update product
      const productResult = await client.query(
        `UPDATE products 
         SET name = $1, description = $2, price = $3, stock_quantity = $4, 
             image_url = $5, category_id = $6
         WHERE id = $7
         RETURNING *`,
        [name, description, price, stock_quantity, image_url, category_id, id],
      )

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" })
      }

      const product = productResult.rows[0]

      // Delete existing options
      await client.query("DELETE FROM product_options WHERE product_id = $1", [id])

      // Add product options (colors)
      if (colors && colors.length > 0) {
        for (const color of colors) {
          await client.query(
            "INSERT INTO product_options (product_id, option_type, option_value) VALUES ($1, $2, $3)",
            [id, "color", color],
          )
        }
      }

      // Add product options (sizes)
      if (sizes && sizes.length > 0) {
        for (const size of sizes) {
          await client.query(
            "INSERT INTO product_options (product_id, option_type, option_value) VALUES ($1, $2, $3)",
            [id, "size", size],
          )
        }
      }

      await client.query("COMMIT")

      // Format response
      product.price = Number.parseFloat(product.price)
      product.colors = colors || []
      product.sizes = sizes || []

      res.status(200).json({
        message: "Product updated successfully",
        product,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete product (admin only)
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.status(200).json({
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all orders (admin only)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", status } = req.query

    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND o.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    query += ` ORDER BY o.created_at DESC`

    // Add pagination
    const pageNum = Number.parseInt(page as string)
    const limitNum = Number.parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limitNum, offset)

    const { rows } = await pool.query(query, queryParams)

    // Format orders
    const orders = rows.map((order) => ({
      ...order,
      total_amount: Number.parseFloat(order.total_amount),
    }))

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM orders WHERE 1=1`
    const countParams = []
    const countParamIndex = 1

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`
      countParams.push(status)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].total)

    res.status(200).json({
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update order status (admin only)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body

  try {
    const result = await pool.query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING *", [status, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" })
    }

    const order = result.rows[0]
    order.total_amount = Number.parseFloat(order.total_amount)

    res.status(200).json({
      message: "Order status updated successfully",
      order,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

