import pool from "../config"
import fs from "fs"
import path from "path"

async function runMigrations() {
  const client = await pool.connect()

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get list of executed migrations
    const { rows } = await client.query("SELECT name FROM migrations")
    const executedMigrations = rows.map((row) => row.name)

    // Read migration files
    const migrationsDir = path.join(__dirname, "scripts")
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    // Execute migrations that haven't been run yet
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        const filePath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(filePath, "utf8")

        console.log(`Running migration: ${file}`)

        await client.query("BEGIN")
        try {
          await client.query(sql)
          await client.query("INSERT INTO migrations (name) VALUES ($1)", [file])
          await client.query("COMMIT")
          console.log(`Migration ${file} completed successfully`)
        } catch (error) {
          await client.query("ROLLBACK")
          console.error(`Error running migration ${file}:`, error)
          throw error
        }
      }
    }

    console.log("All migrations completed")
  } finally {
    client.release()
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err)
    process.exit(1)
  })

