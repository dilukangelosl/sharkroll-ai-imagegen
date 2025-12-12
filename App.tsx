import React, { useState, useCallback } from 'react';
import { GameData, ProcessingStatus, AppSettings, DEFAULT_SETTINGS } from './types';
import SettingsModal from './components/SettingsModal';
import GameCard from './components/GameCard';
import { urlToBase64, compositeFinalImage } from './utils/imageUtils';
import { generatePortraitImage } from './services/geminiService';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [games, setGames] = useState<GameData[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProcessingStatus>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setParseError(null);
  };

  const parseGames = () => {
    try {
      if (!jsonInput.trim()) return;
      
      // Handle potential trailing commas or minor JSON errors loosely if possible, 
      // but standard JSON.parse is safest.
      let parsed: any = JSON.parse(jsonInput);
      
      // If single object, wrap in array
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      // Validate basic structure
      const validGames: GameData[] = parsed.filter((g: any) => g.id && g.name && g.gameThumbnail);
      
      if (validGames.length === 0) {
        setParseError("No valid games found. Ensure JSON has id, name, and gameThumbnail.");
        return;
      }

      setGames(validGames);
      
      // Initialize statuses
      const newStatuses: Record<string, ProcessingStatus> = {};
      validGames.forEach(g => {
        newStatuses[g.id] = { id: g.id, status: 'idle' };
      });
      setStatuses(newStatuses);
      
    } catch (e) {
      setParseError("Invalid JSON format. Please check your input.");
    }
  };

  const updateStatus = (id: string, update: Partial<ProcessingStatus>) => {
    setStatuses(prev => ({
      ...prev,
      [id]: { ...prev[id], ...update }
    }));
  };

  const processGame = useCallback(async (game: GameData) => {
    const id = game.id;
    
    try {
      // Step 1: Download / Convert to Base64
      updateStatus(id, { status: 'downloading', error: undefined });
      const originalBase64 = await urlToBase64(game.gameThumbnail);
      updateStatus(id, { originalImageBase64: originalBase64 });

      // Step 2: Generate Clean Portrait with AI
      updateStatus(id, { status: 'generating' });
      const cleanImageBase64 = await generatePortraitImage(originalBase64, settings.enhancePrompt);
      updateStatus(id, { cleanedImageBase64: cleanImageBase64 });

      // Step 3: Composite (Color Theme, Gradient, Text)
      updateStatus(id, { status: 'compositing' });
      const finalImage = await compositeFinalImage(
        cleanImageBase64,
        game.name,
        game.providerName || "Provider",
        settings.width,
        settings.height
      );

      // Complete
      updateStatus(id, { status: 'complete', finalImageBase64: finalImage });

    } catch (error: any) {
      console.error(`Error processing ${game.name}:`, error);
      updateStatus(id, { status: 'error', error: error.message || "Unknown error" });
    }
  }, [settings]);

  const processAll = () => {
    games.forEach(game => {
      if (statuses[game.id]?.status === 'idle' || statuses[game.id]?.status === 'error') {
        processGame(game);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Sidebar: Input */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-screen sticky top-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Sharkroll Thumbnail<span className="text-white">Gen</span>
          </h1>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-2">Game Data JSON</label>
            <textarea
              className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder='[ { "id": "...", "name": "...", "gameThumbnail": "..." } ]'
              value={jsonInput}
              onChange={handleJsonChange}
            />
          </div>
          
          {parseError && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-200">
              {parseError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={parseGames}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              Load Data
            </button>
            <button
              onClick={processAll}
              disabled={games.length === 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-lg transition"
            >
              Process All
            </button>
          </div>
        </div>
      </div>

      {/* Right Content: Grid */}
      <div className="flex-1 bg-[#0f172a] p-6 overflow-y-auto h-screen">
        {games.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg">Paste JSON data and click "Load Data" to begin.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 content-start">
            {games.map(game => (
              <GameCard 
                key={game.id} 
                game={game} 
                status={statuses[game.id]} 
                onRetry={() => processGame(game)}
              />
            ))}
          </div>
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
};

export default App;