"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getProductById = exports.getAllProducts = void 0;
const config_1 = __importDefault(require("../db/config"));
// Update the getAllProducts function
const getAllProducts = async (req, res) => {
    try {
        const { category, search, sort = "created_at:desc", page = "1", limit = "10", minPrice, maxPrice, colors, sizes, rating, } = req.query;
        let query = `
      SELECT /*+ INDEX(p product_category_idx) */ p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramIndex = 1;
        // Add category filter
        if (category) {
            query += ` AND c.name = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }
        // Add search filter
        if (search) {
            query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        // Add price range filter
        if (minPrice) {
            query += ` AND p.price >= $${paramIndex}`;
            queryParams.push(Number.parseFloat(minPrice));
            paramIndex++;
        }
        if (maxPrice) {
            query += ` AND p.price <= $${paramIndex}`;
            queryParams.push(Number.parseFloat(maxPrice));
            paramIndex++;
        }
        // Add rating filter
        if (rating) {
            query += ` AND p.average_rating >= $${paramIndex}`;
            queryParams.push(Number.parseFloat(rating));
            paramIndex++;
        }
        // Add color filter
        if (colors) {
            const colorArray = colors.split(",");
            query += ` AND p.id IN (
        SELECT DISTINCT product_id FROM product_options 
        WHERE option_type = 'color' AND option_value = ANY($${paramIndex}::text[])
      )`;
            queryParams.push(colorArray);
            paramIndex++;
        }
        // Add size filter
        if (sizes) {
            const sizeArray = sizes.split(",");
            query += ` AND p.id IN (
        SELECT DISTINCT product_id FROM product_options 
        WHERE option_type = 'size' AND option_value = ANY($${paramIndex}::text[])
      )`;
            queryParams.push(sizeArray);
            paramIndex++;
        }
        // Add sorting
        if (sort) {
            const [field, order] = sort.split(":");
            const validFields = ["name", "price", "created_at", "average_rating"];
            const validOrders = ["asc", "desc"];
            if (validFields.includes(field) &&
                validOrders.includes(order.toLowerCase())) {
                query += ` ORDER BY p.${field} ${order.toUpperCase()}`;
            }
            else {
                query += ` ORDER BY p.created_at DESC`;
            }
        }
        else {
            query += ` ORDER BY p.created_at DESC`;
        }
        // Add pagination
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limitNum, offset);
        // Execute query
        const { rows } = await config_1.default.query(query, queryParams);
        // Get total count for pagination
        let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE 1=1
    `;
        const countQueryParams = [];
        let countParamIndex = 1;
        // Add the same filters to count query
        if (category) {
            countQuery += ` AND c.name = $${countParamIndex}`;
            countQueryParams.push(category);
            countParamIndex++;
        }
        if (search) {
            countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex})`;
            countQueryParams.push(`%${search}%`);
            countParamIndex++;
        }
        if (minPrice) {
            countQuery += ` AND p.price >= $${countParamIndex}`;
            countQueryParams.push(Number.parseFloat(minPrice));
            countParamIndex++;
        }
        if (maxPrice) {
            countQuery += ` AND p.price <= $${countParamIndex}`;
            countQueryParams.push(Number.parseFloat(maxPrice));
            countParamIndex++;
        }
        if (rating) {
            countQuery += ` AND p.average_rating >= $${countParamIndex}`;
            countQueryParams.push(Number.parseFloat(rating));
            countParamIndex++;
        }
        if (colors) {
            const colorArray = colors.split(",");
            countQuery += ` AND p.id IN (
        SELECT DISTINCT product_id FROM product_options 
        WHERE option_type = 'color' AND option_value = ANY($${countParamIndex}::text[])
      )`;
            countQueryParams.push(colorArray);
            countParamIndex++;
        }
        if (sizes) {
            const sizeArray = sizes.split(",");
            countQuery += ` AND p.id IN (
        SELECT DISTINCT product_id FROM product_options 
        WHERE option_type = 'size' AND option_value = ANY($${countParamIndex}::text[])
      )`;
            countQueryParams.push(sizeArray);
            countParamIndex++;
        }
        const countResult = await config_1.default.query(countQuery, countQueryParams);
        const total = Number.parseInt(countResult.rows[0].total);
        // Get product options for each product
        const productIds = rows.map((product) => product.id);
        if (productIds.length > 0) {
            const optionsQuery = `
        SELECT * FROM product_options
        WHERE product_id = ANY($1::uuid[])
      `;
            const optionsResult = await config_1.default.query(optionsQuery, [productIds]);
            const options = optionsResult.rows;
            // Group options by product
            const optionsByProduct = options.reduce((acc, option) => {
                if (!acc[option.product_id]) {
                    acc[option.product_id] = {
                        colors: [],
                        sizes: [],
                    };
                }
                if (option.option_type === "color") {
                    acc[option.product_id].colors.push(option.option_value);
                }
                else if (option.option_type === "size") {
                    acc[option.product_id].sizes.push(option.option_value);
                }
                return acc;
            }, {});
            // Add options to products
            rows.forEach((product) => {
                const productOptions = optionsByProduct[product.id] || {
                    colors: [],
                    sizes: [],
                };
                product.colors = productOptions.colors;
                product.sizes = productOptions.sizes;
                // Format price and ratings
                product.price = Number.parseFloat(product.price);
                if (product.average_rating) {
                    product.average_rating = Number.parseFloat(product.average_rating);
                }
            });
        }
        // Get all available filters
        const filtersQuery = `
      SELECT 
        MIN(price) as min_price, 
        MAX(price) as max_price,
        (SELECT ARRAY_AGG(DISTINCT option_value) FROM product_options WHERE option_type = 'color') as colors,
        (SELECT ARRAY_AGG(DISTINCT option_value) FROM product_options WHERE option_type = 'size') as sizes
      FROM products
    `;
        const filtersResult = await config_1.default.query(filtersQuery);
        const filters = filtersResult.rows[0];
        res.status(200).json({
            products: rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
            filters: {
                priceRange: {
                    min: Number.parseFloat(filters.min_price),
                    max: Number.parseFloat(filters.max_price),
                },
                colors: filters.colors || [],
                sizes: filters.sizes || [],
            },
        });
    }
    catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllProducts = getAllProducts;
// Get product by ID
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // Get product
        const productQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
        const productResult = await config_1.default.query(productQuery, [id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        const product = productResult.rows[0];
        // Get product options
        const optionsQuery = `
      SELECT * FROM product_options
      WHERE product_id = $1
    `;
        const optionsResult = await config_1.default.query(optionsQuery, [id]);
        const options = optionsResult.rows;
        // Group options by type
        const colors = options
            .filter((option) => option.option_type === "color")
            .map((option) => option.option_value);
        const sizes = options
            .filter((option) => option.option_type === "size")
            .map((option) => option.option_value);
        res.status(200).json({
            product: {
                ...product,
                colors,
                sizes,
            },
        });
    }
    catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProductById = getProductById;
// Get product categories
const getCategories = async (req, res) => {
    try {
        const { rows } = await config_1.default.query("SELECT * FROM product_categories ORDER BY name");
        res.status(200).json({ categories: rows });
    }
    catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getCategories = getCategories;
