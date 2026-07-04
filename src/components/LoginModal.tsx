import React, { useState } from "react";
import { X, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (email: string, password: string) => Promise<void>;
}

export default function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setIsLoading(true);
    try {
      await onLoginSuccess(email.trim(), password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Use as credenciais demonstradas abaixo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("louvor@igreja.com");
    setPassword("louvor123");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="login-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-2xl"
        id="login-modal-content"
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-slate-900 text-white flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-sans text-lg font-bold tracking-tight">Área Restrita</h2>
            <p className="text-xs text-slate-300">Autenticação de administrador</p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Fechar"
            id="login-modal-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content & Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start space-x-2 rounded-lg bg-red-50 p-3 text-xs sm:text-sm text-red-700 border border-red-100 animate-fadeIn">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="login-email"
                  placeholder="exemplo@igreja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-gray-300 bg-white text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 bg-white text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm transition shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
              id="login-submit-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Autenticando...</span>
                </span>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>

          {/* Quick-fill Helper for Demo */}
          <div className="mt-5 border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Para testar como administrador, clique no botão abaixo para preencher as credenciais padrão:
            </p>
            <button
              type="button"
              onClick={handleFillDemo}
              className="mt-2.5 inline-flex items-center space-x-1.5 rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition cursor-pointer"
              id="quick-demo-fill-btn"
            >
              <span>Preencher Credenciais de Teste</span>
            </button>
            <div className="mt-2 text-[10px] text-slate-400 font-mono">
              E-mail: louvor@igreja.com | Senha: louvor123
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
