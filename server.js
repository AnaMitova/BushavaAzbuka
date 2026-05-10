require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.sqlite");

// Middleware to understand form data and sessions
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-development-key",
    resave: false,
    saveUninitialized: false, // Better to be false for login sessions
  }),
);

// Serve your static files
app.use(express.static(__dirname));

// --- ROUTES ---

// 0. The Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landin2.html"));
});

// 1. The Login Page
app.get("/login", (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname, "admin_pages", "admin.html"));
  } else {
    res.sendFile(path.join(__dirname, "admin_pages", "login.html"));
  }
});

// 2. Handling the Login Logic
app.post("/auth", (req, res) => {
  const { password } = req.body;

  db.get(
    "SELECT * FROM admins WHERE password = ?",
    [password], // Note: Passwords here are plain text based on init-db.js. Re-init db to hashed passwords later if doing production!
    (err, row) => {
      if (row) {
        req.session.loggedin = true;
        res.redirect("/admin");
      } else {
        res.send(
          "Incorrect Password! <a href='/login'>Try Again</a>",
        );
      }
    },
  );
});

// 3. Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// 4. The Protected Admin Panel
app.get("/admin", (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname, "admin_pages", "admin.html"));
  } else {
    res.redirect("/login");
  }
});

// 5. Bad words API
app.get("/api/badwords", (req, res) => {
  db.all("SELECT word FROM words ORDER BY id", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ words: rows.map((r) => r.word) });
  });
});

app.post("/api/badwords", (req, res) => {
  const { word } = req.body;
  if (!word || typeof word !== "string") {
    return res.status(400).json({ error: "Bad word is required" });
  }

  const normalized = word.trim().toLowerCase();
  if (!normalized) {
    return res.status(400).json({ error: "Bad word cannot be empty" });
  }

  db.run(
    "INSERT OR IGNORE INTO words (word) VALUES (?)",
    [normalized],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database insert failed" });
      }
      db.all("SELECT word FROM words ORDER BY id", (err2, rows) => {
        if (err2) {
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ words: rows.map((r) => r.word) });
      });
    },
  );
});

app.delete("/api/badwords/:word", (req, res) => {
  const word = req.params.word;
  if (!word || typeof word !== "string") {
    return res.status(400).json({ error: "Bad word is required" });
  }

  const normalized = decodeURIComponent(word.trim().toLowerCase());
  if (!normalized) {
    return res.status(400).json({ error: "Bad word cannot be empty" });
  }

  db.run(
    "DELETE FROM words WHERE word = ?",
    [normalized],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database delete failed" });
      }
      db.all("SELECT word FROM words ORDER BY id", (err2, rows) => {
        if (err2) {
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ words: rows.map((r) => r.word) });
      });
    },
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
