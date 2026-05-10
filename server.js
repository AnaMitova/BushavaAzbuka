require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.sqlite");

// Middleware to understand form data and sessions
app.use(express.urlencoded({ extended: true }));
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
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM admins WHERE username = ? AND password = ?",
    [username, password], // Note: Passwords here are plain text based on init-db.js. Re-init db to hashed passwords later if doing production!
    (err, row) => {
      if (row) {
        req.session.loggedin = true;
        res.redirect("/admin");
      } else {
        res.send(
          "Incorrect Username and/or Password! <a href='/login'>Try Again</a>",
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
