import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000/api";

function App() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function loadData() {
    try {
      const [userResponse, postsResponse] = await Promise.all([
        fetch(`${API_URL}/me`, { credentials: "include" }),
        fetch(`${API_URL}/blogs`, { credentials: "include" })
      ]);

      if (!userResponse.ok || !postsResponse.ok) {
        throw new Error("Could not load blog information.");
      }

      const userData = await userResponse.json();
      const postsData = await postsResponse.json();

      setUser(userData.user);
      setPosts(postsData);
    } catch (err) {
      setError("Could not connect to the server. Make sure your backend is running.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const endpoint = mode === "signup" ? "/signup" : "/signin";

    const accountData =
      mode === "signup"
        ? { user_id: username, name, password }
        : { user_id: username, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (mode === "signup") {
        setMessage("Account created! You can now sign in.");
        setMode("signin");
        setName("");
        setPassword("");
      } else {
        setMessage("Welcome back!");
        setUsername("");
        setPassword("");
        await loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not sign out.");
      }

      setUser(null);
      cancelEdit();
      setMessage("You have signed out.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/blogs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create post.");
      }

      setTitle("");
      setBody("");
      setMessage("Blog post created successfully.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function startEdit(postId) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/blogs/${postId}`, {
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load this post.");
      }

      setEditingId(postId);
      setTitle(data.title);
      setBody(data.body);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdatePost(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/blogs/${editingId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update post.");
      }

      cancelEdit();
      setMessage("Blog post updated successfully.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeletePost(postId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this blog post?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/blogs/${postId}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete post.");
      }

      setMessage("Blog post deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setBody("");
  }

  return (
    <div className="app">
      <header className="header">
        <h1>My Blog</h1>

        {user ? (
          <div className="user-info">
            <span>Signed in as {user.name}</span>
            <button onClick={handleLogout}>Sign Out</button>
          </div>
        ) : (
          <span>Welcome! Please sign in.</span>
        )}
      </header>

      <main>
        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        {!user && (
          <section className="auth-card">
            <h2>{mode === "signup" ? "Create an Account" : "Sign In"}</h2>

            <form onSubmit={handleSubmit}>
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />

              {mode === "signup" && (
                <>
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </>
              )}

              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button type="submit">
                {mode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="switch-mode">
              {mode === "signup"
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                className="text-button"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "signup" ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </section>
        )}

        {user && (
          <section className="post-form-card">
            <h2>{editingId ? "Edit Your Post" : "Create a Blog Post"}</h2>

            <form onSubmit={editingId ? handleUpdatePost : handleCreatePost}>
              <label>Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter a title"
                required
              />

              <label>Post Content</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your blog post..."
                rows="5"
                required
              />

              <div className="form-buttons">
                <button type="submit">
                  {editingId ? "Save Changes" : "Create Post"}
                </button>

                {editingId && (
                  <button type="button" className="cancel-button" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="posts-section">
          <h2>Blog Posts</h2>

          {posts.length === 0 ? (
            <p>No blog posts yet.</p>
          ) : (
            posts.map((post) => (
              <article className="post-card" key={post.blog_id}>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <small>Written by {post.creator_name}</small>

                {post.isOwner && user && (
                  <div className="post-actions">
                    <button onClick={() => startEdit(post.blog_id)}>
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => handleDeletePost(post.blog_id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;