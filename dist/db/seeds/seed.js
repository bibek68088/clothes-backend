"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
async function seedDatabase() {
    const client = await config_1.default.connect();
    try {
        await client.query("BEGIN");
        // Seed categories
        const categoriesData = [
            { id: (0, uuid_1.v4)(), name: "Clothing", description: "All types of clothing items" },
            { id: (0, uuid_1.v4)(), name: "Accessories", description: "Fashion accessories" },
            { id: (0, uuid_1.v4)(), name: "Footwear", description: "Shoes and boots" },
        ];
        for (const category of categoriesData) {
            await client.query("INSERT INTO product_categories (id, name, description) VALUES ($1, $2, $3)", [
                category.id,
                category.name,
                category.description,
            ]);
        }
        // Seed products
        const productsData = [
            {
                id: (0, uuid_1.v4)(),
                name: "Classic Tee",
                description: "A comfortable and stylish tee for everyday wear.",
                price: 19.99,
                stock_quantity: 100,
                image_url: "/images/tee.jpg",
                category_id: categoriesData[0].id,
            },
            {
                id: (0, uuid_1.v4)(),
                name: "Slim Fit Jeans",
                description: "Modern slim fit jeans made from premium denim.",
                price: 59.99,
                stock_quantity: 50,
                image_url: "/images/jeans.jpg",
                category_id: categoriesData[0].id,
            },
            {
                id: (0, uuid_1.v4)(),
                name: "Leather Jacket",
                description: "A timeless leather jacket for a stylish look.",
                price: 199.99,
                stock_quantity: 25,
                image_url: "/images/jacket.jpg",
                category_id: categoriesData[0].id,
            },
        ];
        for (const product of productsData) {
            await client.query("INSERT INTO products (id, name, description, price, stock_quantity, image_url, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7)", [
                product.id,
                product.name,
                product.description,
                product.price,
                product.stock_quantity,
                product.image_url,
                product.category_id,
            ]);
        }
        // Seed product options
        const productOptionsData = [
            // Colors for Classic Tee
            { product_id: productsData[0].id, option_type: "color", option_value: "Black" },
            { product_id: productsData[0].id, option_type: "color", option_value: "White" },
            { product_id: productsData[0].id, option_type: "color", option_value: "Gray" },
            // Sizes for Classic Tee
            { product_id: productsData[0].id, option_type: "size", option_value: "S" },
            { product_id: productsData[0].id, option_type: "size", option_value: "M" },
            { product_id: productsData[0].id, option_type: "size", option_value: "L" },
            { product_id: productsData[0].id, option_type: "size", option_value: "XL" },
            // Colors for Slim Fit Jeans
            { product_id: productsData[1].id, option_type: "color", option_value: "Blue" },
            { product_id: productsData[1].id, option_type: "color", option_value: "Black" },
            // Sizes for Slim Fit Jeans
            { product_id: productsData[1].id, option_type: "size", option_value: "30" },
            { product_id: productsData[1].id, option_type: "size", option_value: "32" },
            { product_id: productsData[1].id, option_type: "size", option_value: "34" },
            { product_id: productsData[1].id, option_type: "size", option_value: "36" },
            // Colors for Leather Jacket
            { product_id: productsData[2].id, option_type: "color", option_value: "Black" },
            { product_id: productsData[2].id, option_type: "color", option_value: "Brown" },
            // Sizes for Leather Jacket
            { product_id: productsData[2].id, option_type: "size", option_value: "S" },
            { product_id: productsData[2].id, option_type: "size", option_value: "M" },
            { product_id: productsData[2].id, option_type: "size", option_value: "L" },
            { product_id: productsData[2].id, option_type: "size", option_value: "XL" },
        ];
        for (const option of productOptionsData) {
            await client.query("INSERT INTO product_options (product_id, option_type, option_value) VALUES ($1, $2, $3)", [
                option.product_id,
                option.option_type,
                option.option_value,
            ]);
        }
        // Seed test user
        const hashedPassword = await bcryptjs_1.default.hash("password123", 10);
        const userId = (0, uuid_1.v4)();
        await client.query("INSERT INTO users (id, name, email, password, phone) VALUES ($1, $2, $3, $4, $5)", [
            userId,
            "Test User",
            "test@example.com",
            hashedPassword,
            "(123) 456-7890",
        ]);
        // Add address for test user
        await client.query("INSERT INTO user_addresses (user_id, street, city, state, zip_code, country, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7)", [userId, "123 Main St", "New York", "NY", "10001", "United States", true]);
        await client.query("COMMIT");
        console.log("Database seeded successfully");
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("Error seeding database:", error);
        throw error;
    }
    finally {
        client.release();
    }
}
seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
});
