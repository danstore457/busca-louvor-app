import React, { useState } from "react";
import { X, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { UserSession } from "../types.ts";

interface ChangePasswordModalProps {
  session: UserSession;
  onClose: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function ChangePasswordModal({ session, onClose, onShowToast }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (newPassword.length < 4) {
      setError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({
          email: session.email,
          oldPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao alterar a senha.");
      }

      onShowToast("Senha alterada com sucesso!", "success");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="change-password-modal">
      <div className="w-full max-w-md overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-2xl animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-slate-800" />
            <h3 className="font-sans text-lg font-bold tracking-tight text-slate-900">
              Alterar Minha Senha
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition cursor-pointer"
            id="close-password-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-800 flex items-start space-x-2 text-xs font-semibold">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                required
                placeholder="Digite a senha atual"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                placeholder="Digite a nova senha (mín. 4 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Confirme a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center py-2 px-4 rounded-lg border border-gray-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm transition cursor-pointer disabled:opacity-55"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm transition shadow-md cursor-pointer disabled:opacity-55"
              id="save-password-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Alterar Senha</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
