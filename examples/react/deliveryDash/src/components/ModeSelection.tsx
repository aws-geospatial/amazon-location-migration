import { useState } from "react";
import { Character, GameMode } from "../types";

interface ModeSelectionProps {
  characters: Character[];
  onModeSelect: (mode: GameMode, character: Character) => void;
}

export default function ModeSelection({ characters, onModeSelect }: ModeSelectionProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(characters[0]);

  return (
    <div className="mode-selection">
      <div className="mode-selection-content">
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome to Delivery Dash!</h2>
          <p className="welcome-description">
            Can you beat the robot's route optimization? Pick waypoints in your preferred order, then race against the
            optimal route calculated by the algorithm!
          </p>
        </div>

        <div className="character-selection">
          <h3 className="section-title">Choose Your Character</h3>
          <div className="character-grid">
            {characters.map((character) => (
              <div
                key={character.id}
                className={`character-card ${selectedCharacter.id === character.id ? "selected" : ""}`}
                onClick={() => setSelectedCharacter(character)}
                style={{
                  borderColor: selectedCharacter.id === character.id ? character.color : undefined,
                }}
              >
                <div className="character-emoji" style={{ backgroundColor: character.color }}>
                  {character.emoji}
                </div>
                <h4 className="character-name">{character.name}</h4>
                <p className="character-description">{character.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mode-buttons">
          <h3 className="section-title">Choose Game Mode</h3>
          <div className="mode-grid">
            <button className="mode-button quick-start" onClick={() => onModeSelect("quick-start", selectedCharacter)}>
              <div className="mode-icon">⚡</div>
              <h4 className="mode-name">Quick Start</h4>
              <p className="mode-description">We'll find 6 nearby restaurants for you to route through</p>
              <div className="mode-features">
                <span className="feature">✓ Fast setup</span>
                <span className="feature">✓ Auto-generated waypoints</span>
                <span className="feature">✓ Perfect for beginners</span>
              </div>
            </button>

            <button className="mode-button custom-mode" onClick={() => onModeSelect("custom", selectedCharacter)}>
              <div className="mode-icon">🎯</div>
              <h4 className="mode-name">Custom Mode</h4>
              <p className="mode-description">Search and add your own waypoints (up to 10 stops)</p>
              <div className="mode-features">
                <span className="feature">✓ Full control</span>
                <span className="feature">✓ Search any location</span>
                <span className="feature">✓ Find places nearby</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
