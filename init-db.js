const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
        } else {
          console.log("Admins table created or already exists.");

          // Example: Insert default admin if table is empty
          db.get("SELECT count(*) as count FROM admins", (err, row) => {
            if (row && row.count === 0) {
              const defaultUser = "admin";
              const defaultPass = "admin123"; // In a real app, use hashing like bcrypt
              db.run(
                "INSERT INTO admins (username, password) VALUES (?, ?)",
                [defaultUser, defaultPass],
                (err) => {
                  if (err) {
                    console.error(
                      "Error inserting default admin:",
                      err.message,
                    );
                  } else {
                    console.log("Default admin created (admin/admin123).");
                  }
                  db.close();
                },
              );
            } else {
              db.close();
            }
          });
        }
      },
    );
  }
});
