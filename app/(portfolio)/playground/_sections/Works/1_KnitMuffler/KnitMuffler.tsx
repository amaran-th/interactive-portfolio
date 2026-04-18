"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { ColorModeContext } from "./ColorModeContext";
import PlayScreen from "./PlayScreen";
import SelectScreen from "./SelectScreen";
import { ColorMode } from "./type";
import { useKnittingGame } from "./useKnittingGame";

export function SoundToggleButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="absolute top-4 left-4 z-70 rounded-full border border-gray-300 bg-white/90 p-2 shadow-sm"
      aria-label={enabled ? "소리 끄기" : "소리 켜기"}
    >
      {enabled ? (
        <Volume2 className="size-5 sm:size-6" />
      ) : (
        <VolumeX className="size-5 sm:size-6 text-gray-400" />
      )}
    </button>
  );
}

export default function KnitMuffler() {
  const [colorMode, setColorMode] = useState<ColorMode>("normal");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const game = useKnittingGame({ soundEnabled });

  const toggleSound = () => setSoundEnabled((v) => !v);

  return (
    <ColorModeContext.Provider value={colorMode}>
      {game.gameState.screen === "select" ? (
        <SelectScreen
          onStartChallenge={game.startChallenge}
          onStartFreeSlot={game.startFreeSlot}
          onViewFreeSave={game.viewFreeSave}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
      ) : (
        <PlayScreen game={game} />
      )}
    </ColorModeContext.Provider>
  );
}
