"use client";

import { useState } from "react";
import { ColorModeContext } from "./ColorModeContext";
import PlayScreen from "./PlayScreen";
import SelectScreen from "./SelectScreen";
import { ColorMode } from "./type";
import { useKnittingGame } from "./useKnittingGame";

export default function KnitMuffler() {
  const [colorMode, setColorMode] = useState<ColorMode>("normal");
  const game = useKnittingGame();

  return (
    <ColorModeContext.Provider value={colorMode}>
      {game.gameState.screen === "select" ? (
        <SelectScreen
          onStartChallenge={game.startChallenge}
          onStartFreeSlot={game.startFreeSlot}
          onViewFreeSave={game.viewFreeSave}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />
      ) : (
        <PlayScreen game={game} />
      )}
    </ColorModeContext.Provider>
  );
}
