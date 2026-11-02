
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db");

async function seed() {
  try {
    const users = [
      { id: "nate", name: "Nate Jarrett", password: "NateDemo123!" },
      { id: "alex", name: "Alex Morgan", password: "AlexDemo123!" },
      { id: "sam", name: "Sam Taylor", password: "SamDemo123!" },
    ];

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);

      await pool.query(
        `INSERT INTO users (user_id, password, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, hash, user.name]
      );
    }

    const posts = [
      ["Welcome to My Blog", "This is my first blog post.", "nate"],
      ["Learning JavaScript", "JavaScript makes websites interactive.", "alex"],
      ["My Favorite Projects", "I enjoy building applications and learning new tools.", "sam"],
      ["Learning PostgreSQL", "Databases help information persist between sessions.", "nate"],
      ["Tips for Students", "Practice coding a little bit every day.", "alex"],
    ];

    for (const [title, body, userId] of posts) {
      await pool.query(
        `INSERT INTO blogs
           (creator_name, creator_user_id, title, body)
         SELECT name, user_id, $1::varchar(255), $2::text
         FROM users
         WHERE user_id = $3::varchar(255)
           AND NOT EXISTS (
              SELECT 1 FROM blogs
             WHERE title = $1::varchar(255)
               AND creator_user_id = $3::varchar(255)
           )`,
        [title, body, userId]
      );
    }

    console.log("Starter users and posts created.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
