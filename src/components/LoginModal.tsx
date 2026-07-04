import React, { useState } from "react";
import { X, Lock, Mail, Eye, EyeOff, AlertCircle, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (email: string, password: string) => Promise<void>;
}

export default function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "login") {
      if (!email.trim() || !password) {
        setError("Por favor, preencha o e-mail e a senha.");
        return;
      }

      setIsLoading(true);
      try {
        await onLoginSuccess(email.trim(), password);
        onClose();
      } catch (err: any) {
        setError(err.message || "E-mail ou senha incorretos.");
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
        setError("Por favor, preencha todos os campos.");
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }

      if (password.length < 6) {
        setError("A senha deve conter no mínimo 6 caracteres.");
        return;
      }

      setIsLoading(true);
      try {
        // Register the user
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password
          })
        });

        if (!regRes.ok) {
          const errData = await regRes.json();
          throw new Error(errData.error || "Erro ao criar conta.");
        }

        setSuccess("Sua conta foi criada com sucesso! Autenticando...");
        
        // Log in automatically after registration
        setTimeout(async () => {
          try {
            await onLoginSuccess(email.trim(), password);
            onClose();
          } catch (loginErr: any) {
            setError("Conta criada, mas erro ao fazer login automático. Tente entrar manualmente.");
            setMode("login");
            setPassword("");
            setIsLoading(false);
          }
        }, 1500);

      } catch (err: any) {
        setError(err.message || "Ocorreu um erro ao registrar. Tente novamente.");
        setIsLoading(false);
      }
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
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
            <h2 className="font-sans text-lg font-bold tracking-tight">
              {mode === "login" ? "Acessar Conta" : "Criar Nova Conta"}
            </h2>
            <p className="text-xs text-slate-300">
              {mode === "login" 
                ? "Entre para ver e colaborar no repertório" 
                : "Cadastre-se para acessar o repertório de louvor"
              }
            </p>
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

            {success && (
              <div className="flex items-start space-x-2 rounded-lg bg-emerald-50 p-3 text-xs sm:text-sm text-emerald-800 border border-emerald-100 animate-fadeIn">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mt-1.5 shrink-0"></div>
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* Name Input (Register Only) */}
            {mode === "register" && (
              <div>
                <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Seu Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="reg-name"
                    placeholder="Ex: Gabriel Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-gray-300 bg-white text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  id="login-email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
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
                  required
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

            {/* Confirm Password Input (Register Only) */}
            {mode === "register" && (
              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="reg-confirm-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 bg-white text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm transition shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
              id="login-submit-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>{mode === "login" ? "Entrando..." : "Cadastrando..."}</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>{mode === "login" ? "Entrar no Repertório" : "Criar e Entrar"}</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Toggle Link */}
          <div className="mt-5 border-t border-gray-100 pt-4 text-center">
            {mode === "login" ? (
              <p className="text-xs text-slate-500">
                Ainda não tem cadastro?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-bold text-slate-950 underline hover:text-slate-800 cursor-pointer"
                >
                  Criar uma conta grátis
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Já tem uma conta cadastrada?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-bold text-slate-950 underline hover:text-slate-800 cursor-pointer"
                >
                  Fazer login agora
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
