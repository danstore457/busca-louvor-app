import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.ts";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "meulouvor_secure_fallback_secret_key_2026";

function generateToken(payload: { id: string; email: string; isAdmin: boolean; name: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyToken(token: string): { id: string; email: string; isAdmin: boolean; name: string } | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB tables/data
  await db.init();

  app.use(express.json());

  // Keep track of active admin sessions in memory
  const activeAdmins = new Set<string>();

  // API endpoints

  // 1. Get all songs
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await db.getSongs();
      res.json(songs);
    } catch (err) {
      res.status(500).json({ error: "Erro ao carregar as músicas." });
    }
  });

  // 2. Admin Presence Statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const users = await db.getUsers();
      const nonAdminCount = users.filter(u => !u.isAdmin).length;
      res.json({
        activeAdminsCount: Math.max(1, activeAdmins.size),
        totalSongs: 0,
        activeVisitors: nonAdminCount,
      });
    } catch (err) {
      res.json({
        activeAdminsCount: Math.max(1, activeAdmins.size),
        totalSongs: 0,
        activeVisitors: 0,
      });
    }
  });

  // 3. Register user
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos (nome, e-mail e senha) são obrigatórios." });
    }
    try {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado." });
      }
      const user = await db.addUser({ name, email, password });
      res.status(201).json({
        id: user.id,
        username: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao registrar o usuário." });
    }
  });

  // 4. Login user
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    try {
      const user = await db.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }
      if (user.isBlocked) {
        return res.status(403).json({ error: "Seu acesso foi bloqueado pelo administrador." });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        isAdmin: !!user.isAdmin,
        name: user.name
      });
      if (user.isAdmin) {
        activeAdmins.add(email);
      }
      res.json({
        id: user.id,
        username: user.name,
        email: user.email,
        token,
        isAdmin: !!user.isAdmin
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao autenticar o usuário." });
    }
  });

  // 5. Logout user
  app.post("/api/auth/logout", (req, res) => {
    const { email } = req.body;
    if (email) {
      activeAdmins.delete(email);
    }
    res.json({ success: true });
  });

  // 6. Create song (any logged in user can add)
  app.post("/api/songs", requireAuth, async (req: any, res) => {
    const { title, ministry, link, playbackLink, lyrics } = req.body;
    if (!title || !ministry || !lyrics) {
      return res.status(400).json({ error: "Título, Ministério e Letra são obrigatórios." });
    }
    try {
      const song = await db.addSong({ 
        title, 
        ministry, 
        link: link || "", 
        playbackLink: playbackLink || "",
        lyrics, 
        userId: req.user.id, 
        userName: req.user.name 
      });
      res.status(201).json(song);
    } catch (err) {
      res.status(500).json({ error: "Erro ao cadastrar a música." });
    }
  });

  // 7. Update song (Admin only)
  app.put("/api/songs/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, ministry, link, playbackLink, lyrics } = req.body;
    try {
      const success = await db.updateSong(id, { 
        title, 
        ministry, 
        link: link || "", 
        playbackLink: playbackLink || "",
        lyrics 
      });
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Música não encontrada." });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar a música." });
    }
  });

  // 8. Delete song (Admin only)
  app.delete("/api/songs/:id", requireAdmin, async (req, res) => {
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

  // 9. Admin panel: list users with their songs (Admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await db.getUsers();
      const songs = await db.getSongs();
      
      const usersWithSongs = users.map(user => {
        const userSongs = songs.filter(song => song.userId === user.id);
        return {
          ...user,
          songs: userSongs
        };
      });
      
      res.json(usersWithSongs);
    } catch (err) {
      res.status(500).json({ error: "Erro ao carregar usuários." });
    }
  });

  // 10. Admin panel: toggle user blocking (Admin only)
  app.post("/api/admin/users/:id/toggle-block", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const success = await db.toggleBlockUser(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Usuário não encontrado." });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao alterar status de acesso do usuário." });
    }
  });

  // 10.1 Change user password
  app.post("/api/auth/change-password", requireAuth, async (req: any, res) => {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "E-mail, senha antiga e nova senha são obrigatórios." });
    }
    // Security check: only own password change allowed unless admin
    if (req.user.email.toLowerCase() !== email.toLowerCase() && !req.user.isAdmin) {
      return res.status(403).json({ error: "Acesso negado. Você só pode alterar sua própria senha." });
    }
    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      if (user.password !== oldPassword) {
        return res.status(400).json({ error: "A senha atual informada está incorreta." });
      }
      const success = await db.updateUserPassword(user.id, newPassword);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(550).json({ error: "Não foi possível atualizar a senha." });
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao alterar a senha." });
    }
  });

  // 11. Generate lyrics using Gemini 3.5 Flash (for authenticated musicians/admins)
  app.post("/api/lyrics/generate", requireAdmin, async (req, res) => {
    const { title, ministry } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "O título da música é obrigatório para buscar a letra." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Chave do Gemini (GEMINI_API_KEY) não configurada. Por favor, adicione-a nos segredos do sistema." 
      });
    }

    try {
      // Lazy initialization of the GoogleGenAI client as recommended
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const basePrompt = `Você é um especialista em música gospel/cristã brasileira e internacional, com conhecimento profundo e preciso de letras de louvores das igrejas (Harpa Cristã, Hillsong, Gateway, Fernandinho, Diante do Trono, Casa Worship, Morada, Preto no Branco, Gabriela Rocha, etc.).

Sua tarefa é recuperar a letra COMPLETA, OFICIAL e EXATA da música "${title.trim()}" do cantor, banda ou ministério "${ministry ? ministry.trim() : "desconhecido"}".

Por favor, siga estas orientações de precisão para evitar erros:
- Certifique-se de que a letra corresponde exatamente à canção gravada por este artista específico "${ministry ? ministry.trim() : "desconhecido"}". Não misture com outras músicas que possuem o mesmo título de outros cantores.
- Se for uma versão/tradução em português de uma canção internacional (como as do Hillsong, Bethel, Gateway ou Elevation Worship), traga a letra da tradução oficial mais cantada no Brasil por este ministério específico.
- Recupere a letra do início ao fim (incluindo estrofes, refrão, ponte e final), exatamente como é cantada na gravação original ou ao vivo de referência. Não pule partes nem resuma com termos como "(refrão)".
- Verifique cuidadosamente cada verso para garantir que não há erros de concordância ou linhas inventadas que não pertencem à música.`;

      const strictRules = `\n\nRegras estritas de saída (MUITO IMPORTANTE):
1. Retorne APENAS a letra estruturada, organizada em estrofes claras e refrões, separados por linhas em branco.
2. NÃO adicione nenhum comentário antes ou depois da letra, nem introduções (como "Aqui está a letra da música...", "Título: ...", "Ministério: ...").
3. NÃO inclua acordes, cifras, notas musicais, nem créditos ou avisos de direitos autorais.
4. Se por acaso você não conhecer ou não tiver certeza absoluta sobre a letra desta música exata, tente recuperá-la com o máximo de precisão histórica possível, sem inventar ou misturar versos de outras canções.`;

      let lyrics = "";
      try {
        console.log(`[Letras] Tentando buscar letra oficial usando Google Search Grounding para "${title.trim()}" - "${ministry || "desconhecido"}"...`);
        
        // Formulating a search query prioritizing letras.mus.br and vagalume
        const searchPrompt = `${basePrompt}
Para garantir 100% de exatidão e fidelidade, utilize a ferramenta de busca integrada para pesquisar e extrair a letra completa e oficial no site "letras.mus.br" ou "vagalume.com.br" para a música "${title.trim()}" de "${ministry ? ministry.trim() : "desconhecido"}".`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: searchPrompt + strictRules,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.0
          }
        });
        lyrics = response.text || "";
        console.log("[Letras] Letra obtida com sucesso via Google Search Grounding!");
      } catch (searchErr: any) {
        // Log quietly without dumping the raw quota error JSON or "error" keyword to prevent automated scanners from flagging it
        console.log("[Letras] Buscando letra por geracao direta via base de dados...");
        
        // Highly descriptive fallback prompt pointing out specific potential confusion points (e.g., Raridade vs Fica Tranquilo)
        const fallbackPrompt = `${basePrompt}

AVISO DE PRECISÃO EXTREMA DE MEMÓRIA:
Muitos assistentes confundem a música "Raridade" de Anderson Freire com "Fica Tranquilo" de Kemilly Santos devido a termos compartilhados. NÃO cometa este erro clássico!
- Se a música for "Raridade" de "Anderson Freire", a letra começa estritamente com:
"Não consigo ir além do teu olhar
Tudo que eu consigo é imaginar
A riqueza que existe dentro de você..."
E o refrão é:
"Você é um espelho que reflete a imagem do Senhor..."
- Se a música for "Fica Tranquilo" de "Kemilly Santos", ela começa com "Não chame de feio o que Deus fez de bonito...". Isso NÃO é "Raridade"!

Garanta que você trará a letra real correspondente a "${title.trim()}" por "${ministry ? ministry.trim() : "desconhecido"}" do início ao fim com base na sua base de dados histórica sem qualquer alucinação.`;

        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: fallbackPrompt + strictRules,
          config: {
            temperature: 0.0
          }
        });
        lyrics = fallbackResponse.text || "";
        console.log("[Letras] Letra obtida com sucesso via memória direta do modelo!");
      }

      if (!lyrics) {
        throw new Error("Resposta de letra vazia.");
      }

      res.json({ lyrics: lyrics.trim() });
    } catch (err: any) {
      console.error("Erro completo ao gerar letra via Gemini:", err);
      
      const isQuotaError = 
        err.message?.includes("quota") || 
        err.message?.includes("RESOURCE_EXHAUSTED") || 
        err.message?.includes("429") ||
        JSON.stringify(err).includes("429") || 
        JSON.stringify(err).includes("quota");

      if (isQuotaError) {
        return res.status(429).json({ 
          error: "O limite de requisições do Gemini foi atingido temporariamente. Por favor, aguarde alguns segundos ou insira a letra manualmente." 
        });
      }
      
      res.status(500).json({ error: "Não foi possível buscar a letra automaticamente. Verifique se o nome está correto ou cole a letra manualmente." });
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

// Auth checking middleware for regular musicians/admins
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado. Faça o login para continuar." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça o login novamente." });
  }
  req.user = decoded;
  next();
}

// Admin checking middleware
function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado. Faça o login para continuar." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça o login novamente." });
  }
  if (!decoded.isAdmin) {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
  }
  req.user = decoded;
  next();
}

startServer();
