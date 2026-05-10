require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");

    db.serialize(() => {
      // 1. Admins Table
      db.run(
        `CREATE TABLE IF NOT EXISTS admins (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              password TEXT NOT NULL
          )`,
        (err) => {
          if (err) console.error("Error creating admins table:", err.message);
          else console.log("Admins table created or already exists.");
        },
      );

      // 2. Games Table
      db.run(
        `CREATE TABLE IF NOT EXISTS games (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              emoji TEXT,
              url TEXT NOT NULL
          )`,
        (err) => {
          if (err) console.error("Error creating games table:", err.message);
          else console.log("Games table created or already exists.");
        },
      );

      // 3. Words Table
      db.run(
        `CREATE TABLE IF NOT EXISTS words (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              word TEXT UNIQUE NOT NULL
          )`,
        (err) => {
          if (err) console.error("Error creating words table:", err.message);
          else console.log("Words table created or already exists.");
        },
      );

      // Default Admin Check
      db.get("SELECT count(*) as count FROM admins", (err, row) => {
        if (row && row.count === 0) {
          const defaultPass = process.env.ADMIN_PASSWORD;
          db.run(
            "INSERT INTO admins (password) VALUES (?)",
            [defaultPass],
            (err) => {
              if (err) {
                console.error("Error inserting default admin:", err.message);
              } else {
                console.log("Default admin created.");
              }
              db.close();
            },
          );
        } else {
          db.close();
        }
      });
    });
  }
});
