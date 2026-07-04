import React, { useState } from "react";
import { Youtube, ExternalLink, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Song } from "../types.ts";

interface SongCardProps {
  song: Song;
  isAdmin: boolean;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void | Promise<void>;
}

// Simple Spotify SVG icon
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.745-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.51 9.822 1.13.292.18.384.564.206.86zm1.225-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.155-10.077-1.182-.412.125-.845-.107-.97-.52-.125-.41.107-.843.52-.967 3.666-1.114 8.234-.57 11.34 1.343.366.226.486.707.26 1.074zm.107-2.828C14.385 8.71 8.527 8.514 5.137 9.54c-.53.16-1.09-.14-1.252-.67-.16-.53.14-1.09.67-1.252 3.883-1.18 10.353-.956 14.417 1.456.48.284.636.902.35 1.38-.28.484-.9.64-1.38.353z" />
  </svg>
);

export default function SongCard({ song, isAdmin, onEdit, onDelete }: SongCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse reference link to detect brand identity
  const getLinkDetails = (url: string) => {
    const normalized = url.toLowerCase();
    if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
      return {
        label: "Assistir no YouTube",
        colorClass: "bg-[#FF0000] hover:bg-[#E60000] text-white focus:ring-[#FF0000]/50",
        icon: <Youtube className="h-4 w-4" />
      };
    } else if (normalized.includes("spotify.com")) {
      return {
        label: "Ouvir no Spotify",
        colorClass: "bg-[#1DB954] hover:bg-[#1AA34A] text-white focus:ring-[#1DB954]/50",
        icon: <SpotifyIcon className="h-4 w-4" />
      };
    } else {
      return {
        label: "Ver Referência",
        colorClass: "bg-slate-700 hover:bg-slate-800 text-white focus:ring-slate-700/50",
        icon: <ExternalLink className="h-4 w-4" />
      };
    }
  };

  const linkDetails = getLinkDetails(song.link);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col justify-between"
      id={`song-card-${song.id}`}
    >
      <div>
        {/* Top Section: Title & Ministry */}
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate" title={song.title}>
              {song.title}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate" title={song.ministry}>
              {song.ministry}
            </p>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex space-x-1.5 shrink-0" id={`admin-controls-${song.id}`}>
              <button
                onClick={() => onEdit(song)}
                className="p-1.5 rounded-lg border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                title="Editar louvor"
                aria-label="Editar"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(song.id)}
                className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                title="Apagar música"
                aria-label="Apagar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action button: Reference Link */}
        {song.link && song.link.trim() !== "" && (
          <div className="mb-4">
            <a
              href={song.link}
              target="_blank"
              referrerPolicy="no-referrer"
              className={`inline-flex items-center space-x-2 w-full justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${linkDetails.colorClass}`}
              id={`reference-link-${song.id}`}
            >
              {linkDetails.icon}
              <span>{linkDetails.label}</span>
            </a>
          </div>
        )}

        {/* Collapsible Lyrics Area */}
        <div className="mt-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition focus:outline-none"
            aria-expanded={isExpanded}
            id={`toggle-lyrics-${song.id}`}
          >
            <span className="uppercase tracking-wider">Letra da Música</span>
            {isExpanded ? (
              <span className="flex items-center space-x-1">
                <span>Recolher</span>
                <ChevronUp className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center space-x-1">
                <span>Visualizar</span>
                <ChevronDown className="h-4 w-4" />
              </span>
            )}
          </button>

          {/* Animate lyrics open/close */}
          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <pre className="font-sans text-xs sm:text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed max-h-[350px] overflow-y-auto">
                    {song.lyrics}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <div 
                onClick={() => setIsExpanded(true)}
                className="mt-2 p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg cursor-pointer transition text-center"
              >
                <p className="text-xs text-slate-500 italic truncate max-w-full">
                  {song.lyrics.split("\n").filter(line => line.trim().length > 0)[0] || "Clique para ver a letra..."} ...
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
