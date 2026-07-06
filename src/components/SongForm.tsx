import React, { useState, useEffect } from "react";
import { Plus, Check, X, AlertCircle } from "lucide-react";
import { Song } from "../types.ts";

interface SongFormProps {
  editingSong: Song | null;
  onSubmit: (songData: Omit<Song, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function SongForm({ editingSong, onSubmit, onCancel, isSubmitting }: SongFormProps) {
  const [title, setTitle] = useState("");
  const [ministry, setMinistry] = useState("");
  const [link, setLink] = useState("");
  const [playbackLink, setPlaybackLink] = useState("");
  const [songType, setSongType] = useState<"cantado" | "playback">("cantado");
  const [lyrics, setLyrics] = useState("");
  const [error, setError] = useState("");

  // Sync state if editing song changes
  useEffect(() => {
    if (editingSong) {
      setTitle(editingSong.title);
      setMinistry(editingSong.ministry);
      const urlLink = editingSong.link || "";
      const urlPlayback = editingSong.playbackLink || "";
      setLink(urlLink);
      setPlaybackLink(urlPlayback);
      if (urlPlayback.trim() !== "" && !urlLink.trim()) {
        setSongType("playback");
      } else {
        setSongType("cantado");
      }
      setLyrics(editingSong.lyrics);
    } else {
      setTitle("");
      setMinistry("");
      setLink("");
      setPlaybackLink("");
      setSongType("cantado");
      setLyrics("");
    }
    setError("");
  }, [editingSong]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !ministry.trim() || !lyrics.trim()) {
      setError("Por favor, preencha o Nome da Música, Ministério e a Letra.");
      return;
    }

    const finalLink = songType === "cantado" ? link.trim() : "";
    const finalPlaybackLink = songType === "playback" ? playbackLink.trim() : "";

    // Validate link URL structure only if provided and checked
    if (songType === "cantado" && finalLink && !finalLink.startsWith("http://") && !finalLink.startsWith("https://")) {
      setError("O link de referência da versão cantada deve ser uma URL válida começando com http:// ou https://");
      return;
    }

    if (songType === "playback" && finalPlaybackLink && !finalPlaybackLink.startsWith("http://") && !finalPlaybackLink.startsWith("https://")) {
      setError("O link de referência do playback deve ser uma URL válida começando com http:// ou https://");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        ministry: ministry.trim(),
        link: finalLink,
        playbackLink: finalPlaybackLink,
        lyrics: lyrics.trim(),
      });
      
      // Clear on successful new song submission
      if (!editingSong) {
        setTitle("");
        setMinistry("");
        setLink("");
        setPlaybackLink("");
        setSongType("cantado");
        setLyrics("");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar a música.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs" id="song-form-container">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h2 className="font-sans text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Plus className="h-4 w-4" />
          </span>
          {editingSong ? "Editar Louvor" : "Cadastrar Nova Música"}
        </h2>
        {editingSong && (
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center space-x-1 p-1 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Cancelar Edição</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start space-x-2 rounded-lg bg-red-50 p-3 text-xs sm:text-sm text-red-700 border border-red-100 animate-fadeIn">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Nome da Música */}
        <div>
          <label htmlFor="form-title" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Nome da Música
          </label>
          <input
            type="text"
            id="form-title"
            placeholder="Ex: Grandes Coisas, Para Que Entre o Rei"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
          />
        </div>

        {/* Ministério/Comunidade */}
        <div>
          <label htmlFor="form-ministry" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Ministério / Comunidade
          </label>
          <input
            type="text"
            id="form-ministry"
            placeholder="Ex: Fernandinho, Morada, Diante do Trono"
            value={ministry}
            onChange={(e) => setMinistry(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
          />
        </div>

        {/* Seleção do Tipo de Música / Link */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Disponível em:
          </span>
          <div className="grid grid-cols-2 gap-4">
            <label 
              className={`flex items-center space-x-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                songType === "cantado" 
                  ? "border-slate-900 bg-slate-900/5 text-slate-900 font-semibold" 
                  : "border-gray-200 bg-white text-slate-500 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="songType"
                value="cantado"
                checked={songType === "cantado"}
                onChange={() => {
                  setSongType("cantado");
                  setPlaybackLink("");
                }}
                className="rounded-full border-gray-300 text-slate-900 focus:ring-slate-900 h-4.5 w-4.5 cursor-pointer"
              />
              <span className="text-xs sm:text-sm">Versão Cantada</span>
            </label>

            <label 
              className={`flex items-center space-x-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                songType === "playback" 
                  ? "border-slate-900 bg-slate-900/5 text-slate-900 font-semibold" 
                  : "border-gray-200 bg-white text-slate-500 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="songType"
                value="playback"
                checked={songType === "playback"}
                onChange={() => {
                  setSongType("playback");
                  setLink("");
                }}
                className="rounded-full border-gray-300 text-slate-900 focus:ring-slate-900 h-4.5 w-4.5 cursor-pointer"
              />
              <span className="text-xs sm:text-sm">Playback</span>
            </label>
          </div>
        </div>

        {/* Links de Referência (Condicionais) */}
        <div className="grid grid-cols-1 gap-4">
          {songType === "cantado" && (
            <div className="animate-fadeIn">
              <label htmlFor="form-link" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Link da Versão Cantada <span className="text-gray-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="url"
                id="form-link"
                placeholder="Ex: https://www.youtube.com/watch?v=..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
              />
            </div>
          )}

          {songType === "playback" && (
            <div className="animate-fadeIn">
              <label htmlFor="form-playback-link" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Link do Playback / Instrumental <span className="text-gray-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="url"
                id="form-playback-link"
                placeholder="Ex: https://www.youtube.com/watch?v=... playback"
                value={playbackLink}
                onChange={(e) => setPlaybackLink(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition"
              />
            </div>
          )}
        </div>

        {/* Letra da Música */}
        <div>
          <label htmlFor="form-lyrics" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Letra da Música
          </label>
          <textarea
            id="form-lyrics"
            rows={10}
            placeholder="Digite ou cole a letra completa da música aqui..."
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 disabled:bg-slate-50 transition font-sans resize-y leading-relaxed"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          {editingSong && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Descartar</span>
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 inline-flex items-center justify-center space-x-1.5 rounded-lg text-sm font-semibold text-white px-4 py-2 shadow-md transition cursor-pointer ${
              editingSong
                ? "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 focus:ring-slate-500"
                : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 focus:ring-slate-500"
            } disabled:opacity-50`}
            id="form-submit-btn"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Salvando...</span>
              </span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{editingSong ? "Salvar Alterações" : "Cadastrar Música"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
