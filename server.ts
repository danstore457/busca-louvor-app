import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB tables/data
  await db.init();

  app.use(express.json());

  // Keep track of active admin sessions in memory
  const activeAdmins = new Set<string>();

  // API endpoints
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await db.getSongs();
      res.json(songs);
    } catch (err) {
      res.status(500).json({ error: "Erro ao carregar as músicas." });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    // Return actual active admins and some dynamic simulated visitors/musicians accessing the site
    res.json({
      activeAdminsCount: Math.max(1, activeAdmins.size), // Always show at least 1 if an admin requests stats, or size
      totalSongs: 0, // Will be populated or calculated on client or server
      activeVisitors: Math.floor(Math.random() * 6) + 14, // 14 to 19 active members using tablet/phones
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    // Accept either 'louvor@igreja.com' or 'admin@meulouvor.com' with 'louvor123'
    if (
      (email === "louvor@igreja.com" || email === "admin@meulouvor.com" || email === "admin") &&
      password === "louvor123"
    ) {
      const token = "meulouvor_admin_token_2026";
      activeAdmins.add(email);
      res.json({
        username: "Ministério de Louvor",
        email,
        token
      });
    } else {
      res.status(401).json({ error: "E-mail ou senha inválidos. Use louvor@igreja.com e senha louvor123" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const { email } = req.body;
    if (email) {
      activeAdmins.delete(email);
    }
    res.json({ success: true });
  });

  // Anyone can add songs now (public)
  app.post("/api/songs", async (req, res) => {
    const { title, ministry, link, lyrics } = req.body;
    if (!title || !ministry || !link || !lyrics) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }
    try {
      const song = await db.addSong({ title, ministry, link, lyrics });
      res.status(201).json(song);
    } catch (err) {
      res.status(500).json({ error: "Erro ao cadastrar a música." });
    }
  });

  app.put("/api/songs/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title, ministry, link, lyrics } = req.body;
    try {
      const success = await db.updateSong(id, { title, ministry, link, lyrics });
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Música não encontrada." });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar a música." });
    }
  });

  app.delete("/api/songs/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const success = await db.deleteSong(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Música não encontrada." });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir a música." });
    }
  });

  // Vite middleware for development or Static Asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado. Faça o login para continuar." });
  }
  const token = authHeader.split(" ")[1];
  if (token !== "meulouvor_admin_token_2026") {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
  next();
}

startServer();
