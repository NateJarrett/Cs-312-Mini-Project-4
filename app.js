const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "development-secret-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

// Check whether a user is signed in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please sign in first." });
  }
  next();
}

// Get all blog posts
app.get("/api/blogs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT blog_id, creator_name, creator_user_id,
              title, body, date_created
       FROM blogs
       ORDER BY date_created DESC`
    );

    const posts = result.rows.map((post) => ({
      ...post,
      isOwner: post.creator_user_id === req.session.userId
    }));

    res.json(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    res.status(500).json({
      error: error.message,
      code: error.code
});
  }
});

// Check the currently signed-in user
app.get("/api/me", (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  res.json({
    user: {
      user_id: req.session.userId,
      name: req.session.name
    }
  });
});

// Create an account
app.post("/api/signup", async (req, res) => {
  try {
    const { user_id, name, password } = req.body;

    if (!user_id || !name || !password) {
      return res.status(400).json({
        error: "Username, name, and password are required."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (user_id, password, name)
       VALUES ($1, $2, $3)`,
      [user_id.trim(), hashedPassword, name.trim()]
    );

    res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "That username is already in use."
      });
    }

    console.error("Signup error:", error);
    res.status(500).json({ error: "Could not create account." });
  }
});

// Sign in
app.post("/api/signin", async (req, res) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({
        error: "Username and password are required."
      });
    }

    const result = await pool.query(
      "SELECT user_id, password, name FROM users WHERE user_id = $1",
      [user_id.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    req.session.userId = user.user_id;
    req.session.name = user.name;

    res.json({
      message: "Signed in successfully.",
      user: {
        user_id: user.user_id,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Could not sign in." });
  }
});

// Sign out
app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "Could not sign out." });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Signed out successfully." });
  });
});

// Create a blog post
app.post("/api/blogs", requireLogin, async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        error: "Title and content are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO blogs
       (creator_name, creator_user_id, title, body)
       VALUES ($1, $2, $3, $4)
       RETURNING blog_id, creator_name, creator_user_id,
                 title, body, date_created`,
      [req.session.name, req.session.userId, title.trim(), body.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Could not create post." });
  }
});

// Get one post for editing (only its creator)
app.get("/api/blogs/:id", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT blog_id, creator_name, creator_user_id,
              title, body, date_created
       FROM blogs
       WHERE blog_id = $1 AND creator_user_id = $2`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Post not found or you do not own this post."
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ error: "Could not load post." });
  }
});

// Update a post (only its creator)
app.put("/api/blogs/:id", requireLogin, async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        error: "Title and content are required."
      });
    }

    const result = await pool.query(
      `UPDATE blogs
       SET title = $1, body = $2
       WHERE blog_id = $3 AND creator_user_id = $4
       RETURNING blog_id, creator_name, creator_user_id,
                 title, body, date_created`,
      [title.trim(), body.trim(), req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Post not found or you do not own this post."
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: "Could not update post." });
  }
});

// Delete a post (only its creator)
app.delete("/api/blogs/:id", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM blogs
       WHERE blog_id = $1 AND creator_user_id = $2
       RETURNING blog_id`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Post not found or you do not own this post."
      });
    }

    res.json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Could not delete post." });
  }
});

// Start the backend server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});