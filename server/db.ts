import fs from "fs";
import path from "path";
import pg from "pg";
import { Song } from "../src/types.ts";

const { Pool } = pg;

// Helper to get absolute path for local JSON fallback
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "songs.json");

// Default initial songs to pre-populate database if empty
const INITIAL_SONGS: Song[] = [
  {
    id: "1",
    title: "Grandes Coisas",
    ministry: "Fernandinho",
    link: "https://www.youtube.com/watch?v=0_fL9n-WzR0",
    lyrics: `Seja o nosso Deus glorificado\nEle é o Deus da nossa salvação\nCom grande poder e braço estendido\nNos resgatou da escuridão\n\nMaravilhoso, Conselheiro, Deus Forte\nPai da Eternidade e Príncipe da Paz\n\nGrandes coisas o Senhor fez por nós\nPor isso estamos alegres!\nGrandes coisas o Senhor fez por nós\nPor isso estamos alegres!`,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    title: "Para Que Entre o Rei",
    ministry: "Morada",
    link: "https://www.youtube.com/watch?v=R9K1u9Zqf9U",
    lyrics: `Quem é o Rei da glória?\nO Senhor forte e poderoso\nQuem é o Rei da glória?\nO Senhor poderoso nas batalhas\n\nAbri-vos, ó portais eternos\nPara que entre o Rei da glória!\n\nPara que entre o Rei, para que entre o Rei da glória\nJesus, o Rei da glória!\n\nSó Ele é o Senhor!`,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    title: "A Ele a Glória",
    ministry: "Diante do Trono",
    link: "https://open.spotify.com/track/6Zp3PzGv7xS18y528s078W",
    lyrics: `Porque Dele e por Ele\nPara Ele são todas as coisas\nPorque Dele e por Ele\nPara Ele são todas as coisas\n\nA Ele a glória, a Ele a glória\nA Ele a glória para sempre, amém!\n\nQuão profundas riquezas\nO saber e o conhecer de Deus\nQuão insondáveis Seus juízos\nE Seus caminhos!`,
    createdAt: new Date().toISOString()
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
  }

  // Initialize tables if running on PG
  public async init() {
    if (this.isPg && this.pool) {
      try {
        const client = await this.pool.connect();
        console.log("DatabaseManager: Testing PostgreSQL connection...");
        try {
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
          console.log("DatabaseManager: PostgreSQL table 'songs' verified/created.");

          // Check if table is empty, if so, populate with initial songs
          const res = await client.query("SELECT COUNT(*) FROM songs");
          const count = parseInt(res.rows[0].count, 10);
          if (count === 0) {
            console.log("DatabaseManager: PostgreSQL table 'songs' is empty. Pre-populating with default songs...");
            for (const song of INITIAL_SONGS) {
              await client.query(
                "INSERT INTO songs (id, title, ministry, link, lyrics, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
                [song.id, song.title, song.ministry, song.link, song.lyrics, song.createdAt]
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
        const res = await this.pool.query("SELECT id, title, ministry, link, lyrics, created_at FROM songs ORDER BY title ASC");
        return res.rows.map(row => ({
          id: row.id,
          title: row.title,
          ministry: row.ministry,
          link: row.link,
          lyrics: row.lyrics,
          createdAt: row.created_at
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
          "INSERT INTO songs (id, title, ministry, link, lyrics, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [newSong.id, newSong.title, newSong.ministry, newSong.link, newSong.lyrics, newSong.createdAt]
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
          const setClause = fields.map((field, idx) => `${field === 'title' ? 'title' : field === 'ministry' ? 'ministry' : field === 'link' ? 'link' : 'lyrics'} = $${idx + 2}`).join(", ");
          const values = fields.map(f => (updatedFields as any)[f]);
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
}

export const db = new DatabaseManager();
