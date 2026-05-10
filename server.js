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

// Serve your static files with proper MIME types for WebGL builds
app.use((req, res, next) => {
  if (req.path.endsWith('.wasm')) {
    res.type('application/wasm');
  } else if (req.path.endsWith('.data.br')) {
    res.setHeader('Content-Encoding', 'br');
    res.type('application/octet-stream');
  } else if (req.path.endsWith('.data')) {
    res.type('application/octet-stream');
  } else if (req.path.endsWith('.js.br')) {
    res.setHeader('Content-Encoding', 'br');
    res.type('text/javascript');
  } else if (req.path.endsWith('.wasm.br')) {
    res.setHeader('Content-Encoding', 'br');
    res.type('application/wasm');
  } else if (req.path.endsWith('.unityweb')) {
    res.type('application/octet-stream');
  }
  next();
});

app.use(express.static(__dirname));

// --- ROUTES ---

// 0. The Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landin2.html"));
});

// 0.5 API: Check if user is authenticated
app.get("/api/auth/check", (req, res) => {
  res.json({ loggedin: req.session.loggedin || false });
});

// 0.6 API: Get all games with null-safe defaults
app.get("/api/games-debug", (req, res) => {
  db.all("SELECT * FROM games", [], (err, rows) => {
    if (err) {
      console.error("Error fetching games:", err.message);
      res.status(500).json({ error: "Failed to fetch games", details: err.message });
    } else {
      console.log("Raw games from DB:", rows);
      res.json({ count: rows?.length || 0, games: rows || [] });
    }
  });
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

// 5. API: Get all games
app.get("/api/games", (req, res) => {
  db.all("SELECT id, name, emoji, url FROM games ORDER BY id", [], (err, rows) => {
    if (err) {
      console.error("Error fetching games:", err.message);
      res.status(500).json({ error: "Failed to fetch games" });
    } else {
      res.json(rows || []);
    }
  });
});

// 6. API: Create new game
app.post("/api/games", (req, res) => {
  const { name, emoji, url } = req.body;
  
  if (!name || !emoji || !url) {
    return res.status(400).json({ error: "Missing required fields: name, emoji, url" });
  }
  
  db.run(
    "INSERT INTO games (name, emoji, url) VALUES (?, ?, ?)",
    [name, emoji, url],
    function(err) {
      if (err) {
        console.error("Error creating game:", err.message);
        res.status(500).json({ error: "Failed to create game" });
      } else {
        res.json({ id: this.lastID, name, emoji, url });
      }
    }
  );
});

// 7. API: Update game
app.put("/api/games/:id", (req, res) => {
  const { id } = req.params;
  const { name, emoji, url } = req.body;
  
  if (!name || !emoji || !url) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  db.run(
    "UPDATE games SET name = ?, emoji = ?, url = ? WHERE id = ?",
    [name, emoji, url, id],
    function(err) {
      if (err) {
        console.error("Error updating game:", err.message);
        res.status(500).json({ error: "Failed to update game" });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Game not found" });
      } else {
        res.json({ id, name, emoji, url });
      }
    }
  );
});

// 8. API: Delete game
app.delete("/api/games/:id", (req, res) => {
  const { id } = req.params;
  
  db.run(
    "DELETE FROM games WHERE id = ?",
    [id],
    function(err) {
      if (err) {
        console.error("Error deleting game:", err.message);
        res.status(500).json({ error: "Failed to delete game" });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Game not found" });
      } else {
        res.json({ success: true, id });
      }
    }
  );
});

// 9. API: Fix missing game data (admin only)
app.post("/api/games/fix-missing-data/:id", (req, res) => {
  const { id } = req.params;
  const { emoji, url } = req.body;
  
  if (!emoji || !url) {
    return res.status(400).json({ error: "Both emoji and url are required" });
  }
  
  db.run(
    "UPDATE games SET emoji = ?, url = ? WHERE id = ? AND (emoji IS NULL OR emoji = '' OR url IS NULL OR url = '')",
    [emoji, url, id],
    function(err) {
      if (err) {
        console.error("Error fixing game:", err.message);
        res.status(500).json({ error: "Failed to fix game" });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Game not found or already has data" });
      } else {
        res.json({ success: true, id });
      }
    }
  );
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
