import fs from "fs";
import path from "path";
import pg from "pg";
import { Song, User } from "../src/types.ts";

const { Pool } = pg;

// Load default admin credentials from environment or hidden base64 fallback
export const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || Buffer.from("YWRtaW5idXNjYXJsb3V2b3JAZ21haWwuY29t", "base64").toString("utf-8");
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// Helper to get absolute path for local JSON fallback
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "songs.json");
const DATA_USERS_FILE = path.join(DATA_DIR, "users.json");

// Default initial songs to pre-populate database if empty
const INITIAL_SONGS: Song[] = [
  {
    id: "1",
    title: "Grandes Coisas",
    ministry: "Fernandinho",
    link: "https://www.youtube.com/watch?v=0_fL9n-WzR0",
    lyrics: `Seja o nosso Deus glorificado\nEle é o Deus da nossa salvação\nCom grande poder e braço estendido\nNos resgatou da escuridão\n\nMaravilhoso, Conselheiro, Deus Forte\nPai da Eternidade e Príncipe da Paz\n\nGrandes coisas o Senhor fez por nós\nPor isso estamos alegres!\nGrandes coisas o Senhor fez por nós\nPor isso estamos alegres!`,
    createdAt: new Date().toISOString(),
    userId: "admin-1",
    userName: "Administrador"
  },
  {
    id: "2",
    title: "Para Que Entre o Rei",
    ministry: "Morada",
    link: "https://www.youtube.com/watch?v=R9K1u9Zqf9U",
    lyrics: `Quem é o Rei da glória?\nO Senhor forte e poderoso\nQuem é o Rei da glória?\nO Senhor poderoso nas batalhas\n\nAbri-vos, ó portais eternos\nPara que entre o Rei da glória!\n\nPara que entre o Rei, para que entre o Rei da glória\nJesus, o Rei da glória!\n\nSó Ele é o Senhor!`,
    createdAt: new Date().toISOString(),
    userId: "admin-1",
    userName: "Administrador"
  },
  {
    id: "3",
    title: "A Ele a Glória",
    ministry: "Diante do Trono",
    link: "https://open.spotify.com/track/6Zp3PzGv7xS18y528s078W",
    lyrics: `Porque Dele e por Ele\nPara Ele são todas as coisas\nPorque Dele e por Ele\nPara Ele são todas as coisas\n\nA Ele a glória, a Ele a glória\nA Ele a glória para sempre, amém!\n\nQuão profundas riquezas\nO saber e o conhecer de Deus\nQuão insondáveis Seus juízos\nE Seus caminhos!`,
    createdAt: new Date().toISOString(),
    userId: "admin-1",
    userName: "Administrador"
  }
];

class DatabaseManager {
  private pool: pg.Pool | null = null;
  private isPg = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log("DatabaseManager: DATABASE_URL detected. Configuring PostgreSQL pool...");
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false // Common setting for cloud DB connections like Railway, Render, etc.
        }
      });
      this.isPg = true;
    } else {
      console.log("DatabaseManager: DATABASE_URL not detected. Falling back to local JSON storage...");
      this.ensureLocalFileSetup();
    }
  }

  // Ensure JSON folder and file exist with initial data
  private ensureLocalFileSetup() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SONGS, null, 2), "utf-8");
    }
    if (!fs.existsSync(DATA_USERS_FILE)) {
      fs.writeFileSync(DATA_USERS_FILE, JSON.stringify([
        {
          id: "admin-buscarlouvor",
          name: "Administrador",
          email: DEFAULT_ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          isBlocked: false,
          isAdmin: true,
          createdAt: new Date().toISOString()
        }
      ], null, 2), "utf-8");
    } else {
      try {
        const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
        let users: any[] = JSON.parse(data);
        
        // Remove old admins
        users = users.filter(u => {
          const email = u.email.trim().toLowerCase();
          return email !== "admin@buscarlouvor.com" && email !== "dd4674309@gmail.com";
        });
        
        // Check if admin email exists
        const adminIdx = users.findIndex(u => u.email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
        if (adminIdx !== -1) {
          users[adminIdx].isAdmin = true;
          users[adminIdx].isBlocked = false;
        } else {
          users.push({
            id: "admin-buscarlouvor",
            name: "Administrador",
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            isBlocked: false,
            isAdmin: true,
            createdAt: new Date().toISOString()
          });
        }
        fs.writeFileSync(DATA_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      } catch (err) {
        console.error("Error migrating users JSON:", err);
      }
    }
  }

  // Initialize tables if running on PG
  public async init() {
    if (this.isPg && this.pool) {
      try {
        const client = await this.pool.connect();
        console.log("DatabaseManager: Testing PostgreSQL connection...");
        try {
          // 1. Create users table
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id VARCHAR(50) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL UNIQUE,
              password VARCHAR(255) NOT NULL,
              is_blocked BOOLEAN DEFAULT FALSE,
              is_admin BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // 2. Create songs table
          await client.query(`
            CREATE TABLE IF NOT EXISTS songs (
              id VARCHAR(50) PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              ministry VARCHAR(255) NOT NULL,
              link TEXT NOT NULL,
              lyrics TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // 3. Alter songs table to add user_id and user_name columns if they don't exist
          await client.query(`
            ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
            ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
          `);

          console.log("DatabaseManager: PostgreSQL tables verified/created.");

          // 4. Ensure old admins are deleted and admin email is admin
          await client.query("DELETE FROM users WHERE LOWER(email) = $1 OR LOWER(email) = $2", ["admin@buscarlouvor.com", "dd4674309@gmail.com"]);
          
          const adminRes = await client.query("SELECT id FROM users WHERE LOWER(email) = $1", [DEFAULT_ADMIN_EMAIL.toLowerCase()]);
          if (adminRes.rows.length > 0) {
            await client.query("UPDATE users SET is_admin = true, is_blocked = false WHERE LOWER(email) = $1", [DEFAULT_ADMIN_EMAIL.toLowerCase()]);
          } else {
            console.log("DatabaseManager: Creating new admin user in PostgreSQL...");
            await client.query(`
              INSERT INTO users (id, name, email, password, is_blocked, is_admin, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ["admin-buscarlouvor", "Administrador", DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, false, true, new Date().toISOString()]);
          }

          // 5. Check if songs table is empty, if so, populate with initial songs
          const res = await client.query("SELECT COUNT(*) FROM songs");
          const count = parseInt(res.rows[0].count, 10);
          if (count === 0) {
            console.log("DatabaseManager: PostgreSQL table 'songs' is empty. Pre-populating with default songs...");
            for (const song of INITIAL_SONGS) {
              await client.query(
                "INSERT INTO songs (id, title, ministry, link, lyrics, created_at, user_id, user_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [song.id, song.title, song.ministry, song.link, song.lyrics, song.createdAt, "admin-1", "Administrador"]
              );
            }
          }
        } finally {
          client.release();
        }
      } catch (err) {
        console.error("DatabaseManager: Error initializing PostgreSQL, falling back to JSON storage.", err);
        this.isPg = false; // Disable PG fallback to file
        this.ensureLocalFileSetup();
      }
    }
  }

  // Get all songs
  public async getSongs(): Promise<Song[]> {
    if (this.isPg && this.pool) {
      try {
        const res = await this.pool.query("SELECT id, title, ministry, link, lyrics, created_at, user_id, user_name FROM songs ORDER BY title ASC");
        return res.rows.map(row => ({
          id: row.id,
          title: row.title,
          ministry: row.ministry,
          link: row.link,
          lyrics: row.lyrics,
          createdAt: row.created_at,
          userId: row.user_id,
          userName: row.user_name
        }));
      } catch (err) {
        console.error("PG Query error, using file fallback:", err);
      }
    }

    // Fallback JSON read
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const songs: Song[] = JSON.parse(data);
      return songs.sort((a, b) => a.title.localeCompare(b.title));
    } catch (err) {
      console.error("Error reading JSON file:", err);
      return INITIAL_SONGS;
    }
  }

  // Add a song
  public async addSong(song: Omit<Song, "id" | "createdAt">): Promise<Song> {
    const newSong: Song = {
      ...song,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };

    if (this.isPg && this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO songs (id, title, ministry, link, lyrics, created_at, user_id, user_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [newSong.id, newSong.title, newSong.ministry, newSong.link, newSong.lyrics, newSong.createdAt, newSong.userId || null, newSong.userName || null]
        );
        return newSong;
      } catch (err) {
        console.error("PG Insert error, using file fallback:", err);
      }
    }

    // Fallback JSON write
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const songs: Song[] = JSON.parse(data);
      songs.push(newSong);
      fs.writeFileSync(DATA_FILE, JSON.stringify(songs, null, 2), "utf-8");
      return newSong;
    } catch (err) {
      console.error("Error saving to JSON file:", err);
      return newSong;
    }
  }

  // Update a song
  public async updateSong(id: string, updatedFields: Partial<Omit<Song, "id" | "createdAt">>): Promise<boolean> {
    if (this.isPg && this.pool) {
      try {
        const fields = Object.keys(updatedFields);
        if (fields.length > 0) {
          const setClause = fields.map((field, idx) => {
            const dbField = field === 'title' ? 'title' : field === 'ministry' ? 'ministry' : field === 'link' ? 'link' : field === 'lyrics' ? 'lyrics' : field === 'userId' ? 'user_id' : 'user_name';
            return `${dbField} = $${idx + 2}`;
          }).join(", ");
          const values = fields.map(f => {
            const val = (updatedFields as any)[f];
            return val;
          });
          await this.pool.query(
            `UPDATE songs SET ${setClause} WHERE id = $1`,
            [id, ...values]
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error("PG Update error, using file fallback:", err);
      }
    }

    // Fallback JSON update
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const songs: Song[] = JSON.parse(data);
      const index = songs.findIndex(s => s.id === id);
      if (index !== -1) {
        songs[index] = { ...songs[index], ...updatedFields };
        fs.writeFileSync(DATA_FILE, JSON.stringify(songs, null, 2), "utf-8");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating JSON file:", err);
      return false;
    }
  }

  // Delete a song
  public async deleteSong(id: string): Promise<boolean> {
    if (this.isPg && this.pool) {
      try {
        const result = await this.pool.query("DELETE FROM songs WHERE id = $1", [id]);
        return (result.rowCount ?? 0) > 0;
      } catch (err) {
        console.error("PG Delete error, using file fallback:", err);
      }
    }

    // Fallback JSON delete
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const songs: Song[] = JSON.parse(data);
      const filtered = songs.filter(s => s.id !== id);
      if (filtered.length !== songs.length) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2), "utf-8");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error deleting from JSON file:", err);
      return false;
    }
  }

  // Users management
  public async getUsers(): Promise<User[]> {
    if (this.isPg && this.pool) {
      try {
        const res = await this.pool.query("SELECT id, name, email, is_blocked, is_admin, created_at FROM users ORDER BY name ASC");
        return res.rows.map(row => ({
          id: row.id,
          name: row.name,
          email: row.email,
          isBlocked: row.is_blocked,
          isAdmin: row.is_admin,
          createdAt: row.created_at
        }));
      } catch (err) {
        console.error("PG Query users error, using file fallback:", err);
      }
    }

    // Fallback JSON read
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
      const users: any[] = JSON.parse(data);
      return users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isBlocked: !!u.isBlocked,
        isAdmin: !!u.isAdmin,
        createdAt: u.createdAt
      })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("Error reading users JSON file:", err);
      return [];
    }
  }

  public async getUserByEmail(email: string): Promise<any | null> {
    const trimmedEmail = email.trim().toLowerCase();
    if (this.isPg && this.pool) {
      try {
        const res = await this.pool.query("SELECT id, name, email, password, is_blocked, is_admin, created_at FROM users WHERE LOWER(email) = $1", [trimmedEmail]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            name: row.name,
            email: row.email,
            password: row.password,
            isBlocked: row.is_blocked,
            isAdmin: row.is_admin,
            createdAt: row.created_at
          };
        }
        return null;
      } catch (err) {
        console.error("PG Get user by email error, using file fallback:", err);
      }
    }

    // Fallback JSON
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
      const users: any[] = JSON.parse(data);
      const user = users.find(u => u.email.trim().toLowerCase() === trimmedEmail);
      return user || null;
    } catch (err) {
      console.error("Error reading users file for email:", err);
      return null;
    }
  }

  public async addUser(user: Omit<User, "id" | "createdAt" | "isBlocked" | "isAdmin"> & { password: string, isAdmin?: boolean }): Promise<User> {
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: user.name,
      email: user.email.trim().toLowerCase(),
      password: user.password,
      isBlocked: false,
      isAdmin: !!user.isAdmin,
      createdAt: new Date().toISOString()
    };

    if (this.isPg && this.pool) {
      try {
        await this.pool.query(
          "INSERT INTO users (id, name, email, password, is_blocked, is_admin, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [newUser.id, newUser.name, newUser.email, newUser.password, newUser.isBlocked, newUser.isAdmin, newUser.createdAt]
        );
        return {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          isBlocked: newUser.isBlocked,
          isAdmin: newUser.isAdmin,
          createdAt: newUser.createdAt
        };
      } catch (err) {
        console.error("PG Add user error, using file fallback:", err);
      }
    }

    // Fallback JSON write
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
      const users: any[] = JSON.parse(data);
      users.push(newUser);
      fs.writeFileSync(DATA_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isBlocked: newUser.isBlocked,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt
      };
    } catch (err) {
      console.error("Error saving user to JSON file:", err);
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isBlocked: newUser.isBlocked,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt
      };
    }
  }

  public async toggleBlockUser(id: string): Promise<boolean> {
    if (this.isPg && this.pool) {
      try {
        // Fetch current block status
        const res = await this.pool.query("SELECT is_blocked FROM users WHERE id = $1", [id]);
        if (res.rows.length > 0) {
          const nextStatus = !res.rows[0].is_blocked;
          await this.pool.query("UPDATE users SET is_blocked = $1 WHERE id = $2", [nextStatus, id]);
          return true;
        }
        return false;
      } catch (err) {
        console.error("PG toggleBlockUser error, using file fallback:", err);
      }
    }

    // Fallback JSON
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
      const users: any[] = JSON.parse(data);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx].isBlocked = !users[idx].isBlocked;
        fs.writeFileSync(DATA_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error toggling block in JSON file:", err);
      return false;
    }
  }

  public async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    if (this.isPg && this.pool) {
      try {
        await this.pool.query("UPDATE users SET password = $1 WHERE id = $2", [newPassword, id]);
        return true;
      } catch (err) {
        console.error("PG update password error, using file fallback:", err);
      }
    }

    // Fallback JSON
    this.ensureLocalFileSetup();
    try {
      const data = fs.readFileSync(DATA_USERS_FILE, "utf-8");
      const users: any[] = JSON.parse(data);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx].password = newPassword;
        fs.writeFileSync(DATA_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating user password in JSON file:", err);
      return false;
    }
  }
}

export const db = new DatabaseManager();
