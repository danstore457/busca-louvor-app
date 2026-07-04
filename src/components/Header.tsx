import React from "react";
import { Music, LogOut, Lock, User } from "lucide-react";
import { UserSession } from "../types.ts";

interface HeaderProps {
  session: UserSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export default function Header({ session, onOpenLogin, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white shadow-xs sticky top-0 z-40">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo and Branding */}
          <div className="flex items-center space-x-3" id="app-logo-container">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900">
                MeuLouvor
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Ministério de Louvor & Adoração
              </p>
            </div>
          </div>

          {/* User Status and Actions */}
          <div className="flex items-center space-x-3">
            {session ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800">
                    {session.username}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Painel Administrador
                  </span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 sm:hidden">
                  <User className="h-4 w-4" />
                </div>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                  title="Sair do painel administrador"
                  id="logout-btn"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-slate-800 active:bg-slate-950 transition shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                id="login-trigger-btn"
              >
                <Lock className="h-4 w-4" />
                <span>Área Restrita</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
