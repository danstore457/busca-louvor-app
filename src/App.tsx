import React, { useState, useEffect, useMemo } from "react";
import { Search, Music, Sparkles, X, CheckCircle2, AlertCircle, Plus, Users, ShieldAlert, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Song, UserSession } from "./types.ts";
import Header from "./components/Header.tsx";
import SongCard from "./components/SongCard.tsx";
import SongForm from "./components/SongForm.tsx";
import LoginModal from "./components/LoginModal.tsx";
import ChangePasswordModal from "./components/ChangePasswordModal.tsx";
import { motion } from "motion/react";

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  
  // Tab switching for Admin: 'songs' | 'users'
  const [activeTab, setActiveTab] = useState<"songs" | "users">("songs");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

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

  // Whenever session is active, check stats or load users
  useEffect(() => {
    if (session) {
      fetchSongs();
      if (session.isAdmin) {
        fetchAdminUsers();
        fetchAdminStats();
        const interval = setInterval(() => {
          fetchAdminStats();
        }, 10000);
        return () => clearInterval(interval);
      }
    } else {
      setAdminStats(null);
      setAdminUsers([]);
      setActiveTab("songs");
    }
  }, [session]);

  // Fetch admin stats periodically when logged in
  const fetchAdminStats = async () => {
    if (!session || !session.isAdmin) return;
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

  // Fetch list of registered users (Admin only)
  const fetchAdminUsers = async () => {
    if (!session || !session.isAdmin) return;
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${session.token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        // Logged out if unauthorized
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (e) {
      console.error("Erro ao carregar lista de usuários para admin", e);
    }
  };

  // Handle Blocking/Unblocking of users
  const handleToggleBlock = async (userId: string) => {
    if (!session || !session.isAdmin) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-block`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      if (response.ok) {
        showToast("Permissão de acesso do músico atualizada com sucesso!", "success");
        fetchAdminUsers();
      } else {
        const errData = await response.json();
        showToast(errData.error || "Erro ao atualizar permissão.", "error");
      }
    } catch (e) {
      showToast("Erro ao conectar com o servidor.", "error");
    }
  };

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
      showToast(`Bem-vindo, ${sessionData.username}!`, "success");
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
    showToast("Você saiu do catálogo.");
  };

  // Submit new or edited song
  const handleSongSubmit = async (songData: Omit<Song, "id" | "createdAt">) => {
    if (!session) {
      showToast("Você precisa estar autenticado para salvar louvores.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const url = editingSong ? `/api/songs/${editingSong.id}` : "/api/songs";
      const method = editingSong ? "PUT" : "POST";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.token}`
      };

      const payload = editingSong ? songData : {
        ...songData,
        userId: session.id,
        userName: session.username
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Sua sessão expirou ou foi bloqueada.");
      }

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
    if (!session || !session.isAdmin) return;
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

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

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

  // RENDER LANDING PAGE IF NOT AUTHENTICATED
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 animate-fadeIn" id="main-app-container">
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

        {/* Landing Page Content */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 max-w-2xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Music className="h-8 w-8" />
            </div>
            
            <span className="inline-flex items-center space-x-1.5 rounded-full bg-slate-900/5 px-3.5 py-1 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-slate-600" />
              <span>Repertório Colaborativo</span>
            </span>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
              BuscarLouvor
            </h1>

            <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
              O catálogo de louvores colaborativo oficial. Para acessar as músicas, visualizar letras completas, ver referências de áudio/vídeo e colaborar enviando novos louvores, crie uma conta ou faça login.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition shadow-lg cursor-pointer"
              >
                <Lock className="h-4.5 w-4.5" />
                <span>Entrar no Repertório / Criar Conta</span>
              </button>
            </div>

            {/* Informational section about why BuscarLouvor was developed to facilitate worship and media/production teams */}
            <div className="mt-12 text-left bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6" id="about-section">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-slate-700" />
                  Facilidade para a Mídia e Ministério de Louvor
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  O <strong>BuscarLouvor</strong> foi desenvolvido especificamente para resolver os desafios do dia a dia das equipes de ministério e transmissão.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                    <Search className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Playbacks de Alta Qualidade</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Centralize os links oficiais de playbacks e referências no YouTube ou Spotify para que os instrumentistas, cantores e a equipe técnica ensaiem com as versões corretas.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                    <Music className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Mídia e Projeção Rápida</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Esqueça buscas confusas de última hora. As letras dos louvores são organizadas e revisadas de forma limpa, prontas para serem copiadas para o Holyrics, ProPresenter ou outro sistema de projeção.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                    <Users className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Repertório Sempre Alinhado</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sincronização instantânea na nuvem. Quando o administrador ou músico adiciona uma canção, toda a equipe tem acesso em tempo real no celular, tablet ou computador da cabine.
                  </p>
                </div>
              </div>
            </div>

          </motion.div>
        </main>

        {/* Login Modal / Authentication Panel */}
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onLoginSuccess={handleLogin}
          />
        )}

        {/* Footer Area */}
        <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-slate-400 font-medium">
          <p>&copy; {new Date().getFullYear()} BuscarLouvor. Todos os direitos reservados para a Glória de Deus.</p>
        </footer>
      </div>
    );
  }

  // AUTHENTICATED WORKSPACE RENDER
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main-app-container">
      {/* Header with Navigation & Session Control */}
      <Header
        session={session}
        onOpenLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
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
        
        {/* Admin Tab Switching Navigation */}
        {session.isAdmin && (
          <div className="flex border-b border-gray-200 mb-8 bg-white p-1 rounded-xl shadow-xs max-w-xs sm:max-w-sm mx-auto">
            <button
              onClick={() => setActiveTab("songs")}
              className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "songs"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              Catálogo ({songs.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("users");
                fetchAdminUsers();
              }}
              className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              id="admin-users-tab-btn"
            >
              Usuários
            </button>
          </div>
        )}

        {/* Tab 1: Catalog view */}
        {activeTab === "songs" ? (
          <>
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

            {/* Public Add Song Button (Now restricted to logged-in users) */}
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
              
              {/* Admin stats panel Column */}
              {session.isAdmin && (
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
                          Monitorando as conexões ativas no altar e o status das sessões do Ministério de Louvor.
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
                            <span className="block text-2xl font-black text-emerald-600">
                              {adminStats?.activeVisitors ?? 0}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5 leading-none">
                              Músicos Cadastrados
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2 text-[11px] text-amber-800">
                          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                          <p>
                            Como administrador, você pode adicionar, editar ou excluir qualquer louvor, além de gerenciar os usuários cadastrados na aba superior.
                          </p>
                        </div>

                        <button
                          onClick={() => setShowChangePassword(true)}
                          className="w-full inline-flex items-center justify-center space-x-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold py-2.5 transition cursor-pointer shadow-xs"
                          id="admin-change-password-panel-btn"
                        >
                          <Lock className="h-3.5 w-3.5 text-slate-500" />
                          <span>Alterar Minha Senha</span>
                        </button>
                        
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
              <div className={`${session.isAdmin ? "lg:col-span-8" : "lg:col-span-12"} space-y-6`}>
                
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
                      session.isAdmin ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3"
                    } gap-5`}
                    id="songs-grid"
                  >
                    {filteredSongs.map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isAdmin={session.isAdmin}
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
          </>
        ) : (
          /* Tab 2: Admin Users management view */
          session.isAdmin && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fadeIn" id="admin-users-management-panel">
              <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-900" />
                    Controle de Usuários Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Veja as pessoas que criaram conta, as músicas que cadastraram e controle as permissões de acesso.
                  </p>
                </div>
                <button
                  onClick={fetchAdminUsers}
                  className="text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Atualizar Lista
                </button>
              </div>

              <div className="space-y-4">
                {adminUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    Nenhum usuário cadastrado ou buscando dados...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <th className="py-3 px-4">Nome do Músico</th>
                          <th className="py-3 px-4">Músicas Cadastradas</th>
                          <th className="py-3 px-4 text-right">Ações de Acesso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {adminUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition">
                            {/* Registered User Name & Email */}
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                {u.name}
                                {u.isAdmin && (
                                  <span className="bg-slate-900/10 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Admin
                                  </span>
                                )}
                                {u.isBlocked && (
                                  <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Acesso Bloqueado
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 font-mono">{u.email}</div>
                            </td>
                            
                            {/* Song Titles Added by this user */}
                            <td className="py-4 px-4 max-w-md">
                              {u.songs && u.songs.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {u.songs.map((s: any) => (
                                    <span 
                                      key={s.id} 
                                      className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 font-semibold"
                                    >
                                      {s.title}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Nenhuma música cadastrada</span>
                              )}
                            </td>

                            {/* Block Button */}
                            <td className="py-4 px-4 text-right">
                              {u.isAdmin ? (
                                <span className="text-xs text-slate-400 italic font-medium">Administrador Principal</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleBlock(u.id)}
                                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                    u.isBlocked
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                  }`}
                                >
                                  {u.isBlocked ? "Liberar Acesso" : "Bloquear Acesso"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )
        )}

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

      {/* Change Password Modal */}
      {showChangePassword && session && (
        <ChangePasswordModal
          session={session}
          onClose={() => setShowChangePassword(false)}
          onShowToast={showToast}
        />
      )}

      {/* Footer Area */}
      <footer className="bg-white border-t border-gray-100 mt-16 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} BuscarLouvor. Todos os direitos reservados para a Glória de Deus.</p>
        </div>
      </footer>
    </div>
  );
}
