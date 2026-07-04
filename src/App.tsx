import React, { useState, useEffect, useMemo } from "react";
import { Search, Music, Sparkles, X, CheckCircle2, AlertCircle, Plus, Users, ShieldAlert } from "lucide-react";
import { Song, UserSession } from "./types.ts";
import Header from "./components/Header.tsx";
import SongCard from "./components/SongCard.tsx";
import SongForm from "./components/SongForm.tsx";
import LoginModal from "./components/LoginModal.tsx";

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  
  // Admin Presence Statistics
  const [adminStats, setAdminStats] = useState<{ activeAdminsCount: number; activeVisitors: number } | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("meulouvor_session");
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem("meulouvor_session");
      }
    }
    fetchSongs();
  }, []);

  // Fetch admin stats periodically when logged in
  const fetchAdminStats = async () => {
    if (!session) return;
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (e) {
      console.error("Erro ao carregar estatísticas do admin", e);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAdminStats();
      const interval = setInterval(fetchAdminStats, 10000);
      return () => clearInterval(interval);
    } else {
      setAdminStats(null);
    }
  }, [session]);

  // Show status toasts
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all songs from the API
  const fetchSongs = async () => {
    setIsLoading(true);
    setApiError("");
    try {
      const response = await fetch("/api/songs");
      if (!response.ok) {
        throw new Error("Falha ao comunicar com o servidor.");
      }
      const data = await response.json();
      setSongs(data);
    } catch (err: any) {
      setApiError(err.message || "Erro ao conectar-se ao catálogo de músicas.");
    } finally {
      setIsLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "E-mail ou senha incorretos.");
      }

      const sessionData: UserSession = await response.json();
      setSession(sessionData);
      localStorage.setItem("meulouvor_session", JSON.stringify(sessionData));
      showToast("Acesso administrativo autorizado com sucesso!", "success");
    } catch (err: any) {
      throw err;
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (session) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.email })
        });
      } catch (e) {
        console.error("Logout request failed, cleaning local session anyway", e);
      }
    }
    setSession(null);
    localStorage.removeItem("meulouvor_session");
    setEditingSong(null); // Cancel edit on logout
    showToast("Você saiu da área restrita do catálogo.");
  };

  // Submit new or edited song
  const handleSongSubmit = async (songData: Omit<Song, "id" | "createdAt">) => {
    // If editing, require session. If adding, anyone can register.
    if (editingSong && !session) return;
    
    setIsSubmitting(true);
    try {
      const url = editingSong ? `/api/songs/${editingSong.id}` : "/api/songs";
      const method = editingSong ? "PUT" : "POST";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(songData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Não foi possível salvar a música.");
      }

      showToast(
        editingSong ? "Música atualizada com sucesso!" : "Música cadastrada com sucesso por você!",
        "success"
      );
      
      setEditingSong(null);
      setShowAddForm(false);
      await fetchSongs(); // Refresh list
    } catch (err: any) {
      showToast(err.message || "Ocorreu um erro ao salvar o louvor.", "error");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete song - Trigger custom confirmation modal
  const handleDeleteSong = (id: string) => {
    if (!session) return;
    const song = songs.find(s => s.id === id);
    if (song) {
      setSongToDelete(song);
    }
  };

  // Actual deletion request to backend API
  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/songs/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.token}`
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Não foi possível apagar a música.");
      }

      showToast("Música apagada com sucesso do catálogo.", "success");
      
      if (editingSong?.id === id) {
        setEditingSong(null);
      }
      
      await fetchSongs();
    } catch (err: any) {
      showToast(err.message || "Erro ao apagar a música.", "error");
    }
  };

  // Real-time filter mechanism (Nome, Ministério/Comunidade, ou qualquer palavra na Letra)
  const filteredSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return songs;

    return songs.filter((song) => {
      const matchTitle = song.title.toLowerCase().includes(query);
      const matchMinistry = song.ministry.toLowerCase().includes(query);
      const matchLyrics = song.lyrics.toLowerCase().includes(query);
      return matchTitle || matchMinistry || matchLyrics;
    });
  }, [songs, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main-app-container">
      {/* Header with Navigation & Session Control */}
      <Header
        session={session}
        onOpenLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      {/* Floating Action Toasts */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce" id="action-toast">
          <div className={`flex items-center space-x-2 rounded-xl p-4 shadow-xl border text-sm font-semibold ${
            toast.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
              : "bg-red-50 text-red-800 border-red-100"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-6 sm:px-6 lg:py-10">
        
        {/* Welcome Hero Area */}
        <section className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-slate-900/5 px-3.5 py-1 text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-slate-600" />
            <span>Repertório Colaborativo</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Encontre o louvor ideal para o altar
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Pesquise instantaneamente por nome da música, ministério/comunidade, ou trechos das letras. Acesse as referências oficiais no YouTube e Spotify rapidamente no celular ou tablet.
          </p>
        </section>

        {/* Dynamic Live Search Section */}
        <section className="mb-6" id="search-section">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Digite o título, ministério (ex: Morada) ou frases da letra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-gray-200 bg-white text-base text-slate-900 shadow-sm focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 transition duration-150"
              id="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-center mt-3">
              <p className="text-xs font-medium text-slate-500">
                Filtrando resultados para <span className="font-bold text-slate-700">"{searchQuery}"</span> &bull; Encontradas <span className="font-bold text-slate-700">{filteredSongs.length}</span> músicas
              </p>
            </div>
          )}
        </section>

        {/* Public Add Song Button */}
        <section className="flex flex-col items-center mb-8">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingSong(null); // Descartar edição se abrir form de cadastro público
            }}
            className="inline-flex items-center space-x-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
            id="public-add-song-btn"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? "Fechar Formulário" : "Cadastrar Nova Música"}</span>
          </button>

          {/* Form when shown (Public or Admin Editing) */}
          {(showAddForm || editingSong) && (
            <div className="w-full max-w-2xl mt-5 animate-fadeIn">
              <SongForm
                editingSong={editingSong}
                onSubmit={handleSongSubmit}
                onCancel={() => {
                  setEditingSong(null);
                  setShowAddForm(false);
                }}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </section>

        {/* Catalog and Administration Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Admin panel Column (Only displayed when logged in to see how many people are online) */}
          {session && (
            <div className="lg:col-span-4 order-first lg:order-last space-y-6">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm bg-radial from-white to-emerald-50/10" id="admin-presence-panel">
                  <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 mb-4">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-sans text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="h-4.5 w-4.5 text-slate-800" />
                      Painel Administrativo
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Este painel serve para monitorar as conexões ativas no altar e o status das sessões do Ministério de Louvor.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <span className="block text-2xl font-black text-slate-900">
                          {adminStats?.activeAdminsCount ?? 1}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5 leading-none">
                          Admins Logados
                        </span>
                      </div>
                      
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <span className="block text-2xl font-black text-emerald-600 animate-pulse">
                          {adminStats?.activeVisitors ?? 16}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5 leading-none">
                          Músicos Online
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2 text-[11px] text-amber-800">
                      <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>Dica de Segurança:</strong> Apenas administradores logados podem editar ou excluir as músicas listadas abaixo.
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Atualização automática</span>
                      <span>A cada 10s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Songs Cards List Column */}
          <div className={`${session ? "lg:col-span-8" : "lg:col-span-12"} space-y-6`}>
            
            {/* Database or API Error warning */}
            {apiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start space-x-3 shadow-xs">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Falha na conexão do catálogo</h4>
                  <p className="text-xs text-red-700 mt-1">{apiError}</p>
                  <button 
                    onClick={fetchSongs}
                    className="mt-2.5 inline-flex items-center text-xs font-bold text-red-800 underline hover:text-red-950 transition"
                  >
                    Tentar carregar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3" id="loading-spinner">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-900 border-t-transparent"></div>
                <p className="text-sm font-medium text-slate-500 animate-pulse">Sincronizando repertório com a nuvem...</p>
              </div>
            ) : filteredSongs.length > 0 ? (
              <div 
                className={`grid grid-cols-1 ${
                  session ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3"
                } gap-5`}
                id="songs-grid"
              >
                {filteredSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isAdmin={!!session}
                    onEdit={(s) => {
                      setEditingSong(s);
                      setShowAddForm(false);
                      // Scroll to top/form on selection
                      window.scrollTo({ top: 150, behavior: "smooth" });
                    }}
                    onDelete={handleDeleteSong}
                  />
                ))}
              </div>
            ) : (
              /* Empty state placeholder */
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs max-w-lg mx-auto" id="empty-state">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-4">
                  <Music className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Nenhum louvor encontrado</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Não encontramos nenhuma música com os critérios informados. Aproveite para cadastrá-la no botão acima!
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    Limpar filtro de busca
                  </button>
                )}
              </div>
            )}

          </div>

        </section>

      </main>

      {/* Custom Confirmation Modal for Deletion */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="delete-confirmation-modal">
          <div className="w-full max-w-md overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-2xl p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="font-sans text-lg font-bold tracking-tight">Apagar Louvor</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Deseja realmente apagar a música <strong className="text-slate-900">"{songToDelete.title}"</strong> do catálogo? Esta ação é definitiva e não poderá ser desfeita.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSongToDelete(null)}
                className="flex-1 inline-flex items-center justify-center py-2 px-4 rounded-lg border border-gray-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = songToDelete.id;
                  setSongToDelete(null);
                  await executeDelete(id);
                }}
                className="flex-1 inline-flex items-center justify-center py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm transition shadow-md cursor-pointer"
                id="confirm-delete-btn"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal / Authentication Panel */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLogin}
        />
      )}

      {/* Footer Area */}
      <footer className="bg-white border-t border-gray-100 mt-16 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} MeuLouvor. Todos os direitos reservados para a Glória de Deus.</p>
        </div>
      </footer>
    </div>
  );
}
