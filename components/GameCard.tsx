import React from "react";
import { GameData, ProcessingStatus } from "../types";

interface GameCardProps {
  game: GameData;
  status: ProcessingStatus;
  onRetry: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, status, onRetry }) => {
  const isProcessing = ["downloading", "generating", "compositing"].includes(
    status.status
  );

  return (
    <div className="flex flex-col items-center gap-2 ">
      <div className="w-[140px] h-[188px] shrink-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col group relative shadow-md hover:shadow-xl transition-shadow">
        {/* Image Container */}
        <div className="w-full h-full relative bg-slate-900">
          {/* Render Logic based on Status */}
          {status.status === "complete" && status.finalImageBase64 ? (
            <img
              src={status.finalImageBase64}
              alt={game.name}
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : status.status === "idle" ||
            status.status === "downloading" ||
            status.status === "error" ? (
            // Show original thumbnail (if valid url) as placeholder
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
              {/* Blurred background for fill */}
              <div
                className="absolute inset-0 opacity-40 bg-cover bg-center blur-sm"
                style={{ backgroundImage: `url(${game.gameThumbnail})` }}
              ></div>
              <img
                src={game.gameThumbnail}
                alt="Original"
                className="relative max-w-full max-h-full object-contain z-10 shadow-sm"
              />
            </div>
          ) : // Generating/Compositing state
          status.cleanedImageBase64 ? (
            <img
              src={status.cleanedImageBase64}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <div className="animate-pulse bg-slate-700 w-full h-full"></div>
            </div>
          )}

          {/* Info Overlay (Always visible at bottom with gradient) */}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-[2px] z-20 p-2 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-[9px] font-semibold text-blue-200 uppercase tracking-wider leading-tight">
                {status.status === "downloading" && "Fetching"}
                {status.status === "generating" && "AI Magic"}
                {status.status === "compositing" && "Finishing"}
              </span>
            </div>
          )}

          {/* Error Overlay */}
          {status.status === "error" && (
            <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-2 text-center z-20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-200 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-[9px] text-red-100 mb-2 leading-tight line-clamp-2">
                {status.error || "Failed"}
              </p>
              <button
                onClick={onRetry}
                className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-[9px] text-white font-bold uppercase tracking-wide border border-red-500"
              >
                Retry
              </button>
            </div>
          )}

          {/* Hover Actions (Download) */}
          {status.status === "complete" && (
            <div className="absolute inset-0 z-30 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
              <a
                href={status.finalImageBase64}
                download={`${game.slug || "game"}-portrait.png`}
                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg transform hover:scale-105 transition-all flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Save
              </a>
            </div>
          )}
        </div>
      </div>
      <h3
        className="font-bold text-[11px] leading-tight text-white truncate drop-shadow-md"
        title={game.name}
      >
        {game.name}
      </h3>
      <p className="text-[9px] text-slate-300 truncate drop-shadow-md">
        {game.providerName}
      </p>
    </div>
  );
};

export default GameCard;
