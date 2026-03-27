import { Character, RaceResult } from "../types";
import { formatDistance, formatDuration } from "../gameData";

interface ResultsViewProps {
  character: Character;
  result: RaceResult;
  onPlayAgain: () => void;
}

export default function ResultsView({ character, result, onPlayAgain }: ResultsViewProps) {
  const getMessage = () => {
    if (result.userWon) {
      if (result.efficiency >= 100) {
        return {
          title: "🏆 PERFECT ROUTE!",
          subtitle: "You matched the optimal route!",
          message: "Your routing skills are incredible! You found the most efficient path.",
        };
      } else {
        return {
          title: "🎉 YOU WON!",
          subtitle: "Your route was better!",
          message: "Amazing! You beat the optimization algorithm!",
        };
      }
    } else {
      if (result.efficiency >= 90) {
        return {
          title: "👏 EXCELLENT!",
          subtitle: "So close to optimal!",
          message: "Great routing! You were within 10% of the optimal route.",
        };
      } else if (result.efficiency >= 75) {
        return {
          title: "👍 GOOD JOB!",
          subtitle: "Not bad at all!",
          message: "Solid effort! With practice, you can get even closer.",
        };
      } else {
        return {
          title: "🤖 ROBOT WINS",
          subtitle: "The algorithm was faster",
          message: "Don't worry! Routing optimization is complex. Try again!",
        };
      }
    }
  };

  const message = getMessage();

  return (
    <div className="results-view">
      <div className="results-content">
        <div className="results-header">
          <div className="result-trophy">{message.title.split(" ")[0]}</div>
          <h2 className="result-title">{message.title.substring(message.title.indexOf(" ") + 1)}</h2>
          <p className="result-subtitle">{message.subtitle}</p>
        </div>

        <div className="results-stats">
          <div className="stat-card your-stats" style={{ borderColor: character.color }}>
            <div className="stat-header" style={{ backgroundColor: character.color }}>
              <span className="stat-emoji">{character.emoji}</span>
              <span className="stat-label">Your Route</span>
            </div>
            <div className="stat-body">
              <div className="stat-row">
                <span className="stat-name">Distance</span>
                <span className="stat-value">{formatDistance(result.userDistance)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">Time</span>
                <span className="stat-value">{formatDuration(result.userDuration)}</span>
              </div>
            </div>
          </div>

          <div className="stats-divider">
            <div className="divider-line" />
            <div className="divider-text">VS</div>
            <div className="divider-line" />
          </div>

          <div className="stat-card optimal-stats" style={{ borderColor: "#4CAF50" }}>
            <div className="stat-header" style={{ backgroundColor: "#4CAF50" }}>
              <span className="stat-emoji">🤖</span>
              <span className="stat-label">Optimal Route</span>
            </div>
            <div className="stat-body">
              <div className="stat-row">
                <span className="stat-name">Distance</span>
                <span className="stat-value">{formatDistance(result.optimalDistance)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">Time</span>
                <span className="stat-value">{formatDuration(result.optimalDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="efficiency-card">
          <div className="efficiency-label">Efficiency Score</div>
          <div className="efficiency-value">
            <span className="efficiency-number">{result.efficiency}%</span>
            <div className="efficiency-bar">
              <div
                className="efficiency-fill"
                style={{
                  width: `${Math.min(result.efficiency, 100)}%`,
                  backgroundColor:
                    result.efficiency >= 90 ? "#4CAF50" : result.efficiency >= 75 ? "#FF9800" : "#F44336",
                }}
              />
            </div>
          </div>
          <div className="time-difference">
            {result.timeSaved > 0 ? (
              <span className="time-slower">⏱️ You were {formatDuration(Math.abs(result.timeSaved))} slower</span>
            ) : result.timeSaved < 0 ? (
              <span className="time-faster">⚡ You were {formatDuration(Math.abs(result.timeSaved))} faster!</span>
            ) : (
              <span className="time-equal">🎯 Exactly the same time!</span>
            )}
          </div>
        </div>

        <div className="result-message">
          <p>{message.message}</p>
        </div>

        <div className="result-actions">
          <button className="play-again-button" onClick={onPlayAgain}>
            🔄 Play Again
          </button>
        </div>

        <div className="result-footer">
          <p className="footer-text">Powered by advanced routing with waypoint optimization</p>
        </div>
      </div>
    </div>
  );
}
