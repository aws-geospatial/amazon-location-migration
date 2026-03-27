import { useState, useCallback } from "react";
import ModeSelection from "./components/ModeSelection";
import GameBoard from "./components/GameBoard";
import RaceView from "./components/RaceView";
import ResultsView from "./components/ResultsView";
import { Character, GameMode, GameState, Waypoint, UserRoute, OptimalRoute, RaceResult } from "./types";
import { CHARACTERS } from "./gameData";
import "./App.css";

function App() {
  const [gameState, setGameState] = useState<GameState>("mode-selection");
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [availableWaypoints, setAvailableWaypoints] = useState<Waypoint[]>([]);
  const [userRoute, setUserRoute] = useState<UserRoute>({ waypoints: [] });
  const [optimalRoute, setOptimalRoute] = useState<OptimalRoute | null>(null);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  const handleModeSelect = useCallback((mode: GameMode, character: Character) => {
    setSelectedMode(mode);
    setSelectedCharacter(character);
    setGameState("waypoint-loading");
  }, []);

  const handleWaypointsLoaded = useCallback((waypoints: Waypoint[]) => {
    setAvailableWaypoints(waypoints);
    setGameState("route-building");
  }, []);

  const handleStartRace = useCallback((userRouteData: UserRoute, optimalRouteData: OptimalRoute) => {
    setUserRoute(userRouteData);
    setOptimalRoute(optimalRouteData);
    setGameState("racing");
  }, []);

  const handleRaceComplete = useCallback((result: RaceResult) => {
    setRaceResult(result);
    setGameState("results");
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameState("mode-selection");
    setSelectedMode(null);
    setAvailableWaypoints([]);
    setUserRoute({ waypoints: [] });
    setOptimalRoute(null);
    setRaceResult(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🚚 Delivery Dash</h1>
          <p className="app-tagline">Race against the robot's optimal route!</p>
        </div>
      </header>

      <main className="app-main">
        {gameState === "mode-selection" && <ModeSelection characters={CHARACTERS} onModeSelect={handleModeSelect} />}

        {(gameState === "waypoint-loading" || gameState === "route-building") && (
          <GameBoard
            mode={selectedMode!}
            character={selectedCharacter}
            gameState={gameState}
            availableWaypoints={availableWaypoints}
            onWaypointsLoaded={handleWaypointsLoaded}
            onStartRace={handleStartRace}
            onBack={handlePlayAgain}
          />
        )}

        {gameState === "racing" && optimalRoute && (
          <RaceView
            character={selectedCharacter}
            userRoute={userRoute}
            optimalRoute={optimalRoute}
            onRaceComplete={handleRaceComplete}
          />
        )}

        {gameState === "results" && raceResult && (
          <ResultsView character={selectedCharacter} result={raceResult} onPlayAgain={handlePlayAgain} />
        )}
      </main>
    </div>
  );
}

export default App;
