import { useState, useEffect, useCallback } from "react";
import GameMap from "./GameMap";
import WaypointSearch from "./WaypointSearch";
import { Character, GameMode, GameState, Waypoint, UserRoute, OptimalRoute } from "../types";
import { useMapInit } from "../MapConfigContext";
import { DEFAULT_CENTER } from "../gameData";

interface GameBoardProps {
  mode: GameMode;
  character: Character;
  gameState: GameState;
  availableWaypoints: Waypoint[];
  onWaypointsLoaded: (waypoints: Waypoint[]) => void;
  onStartRace: (userRoute: UserRoute, optimalRoute: OptimalRoute) => void;
  onBack: () => void;
}

export default function GameBoard({
  mode,
  character,
  gameState,
  availableWaypoints,
  onWaypointsLoaded,
  onStartRace,
  onBack,
}: GameBoardProps) {
  const initGoogleMaps = useMapInit();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userSelectedWaypoints, setUserSelectedWaypoints] = useState<Waypoint[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load waypoints for quick start mode, or skip loading for custom mode
  useEffect(() => {
    if (gameState === "waypoint-loading" && map) {
      if (mode === "quick-start") {
        loadQuickStartWaypoints();
      } else if (mode === "custom") {
        // For custom mode, start with no waypoints - user will search and add their own
        onWaypointsLoaded([]);
      }
    }
  }, [mode, gameState, map]);

  const loadQuickStartWaypoints = async () => {
    try {
      await initGoogleMaps();

      // Get user's location or use default (San Francisco)
      const center = await getUserLocation();
      const centerLatLng = new google.maps.LatLng(center.lat, center.lng);

      // Use new Place API searchNearby
      const request = {
        fields: ["displayName", "formattedAddress", "location", "id", "types"],
        locationRestriction: {
          center: centerLatLng,
          radius: 5000,
        },
        includedTypes: ["restaurant"],
        maxResultCount: 10,
      };

      const { places } = await google.maps.places.Place.searchNearby(request);

      if (places && places.length > 0) {
        const waypoints: Waypoint[] = places.slice(0, 6).map((place, index) => ({
          id: `waypoint-${index}`,
          name: place.displayName || "Unknown",
          location: {
            lat: place.location!.lat(),
            lng: place.location!.lng(),
          },
          address: place.formattedAddress,
          placeId: place.id,
          type: "restaurant",
        }));

        onWaypointsLoaded(waypoints);
      } else {
        setError("Failed to find nearby places. Using default locations.");
        onWaypointsLoaded(getMockWaypoints());
      }
    } catch (err) {
      console.error("Error loading waypoints:", err);
      setError("Failed to load waypoints. Using default locations.");
      onWaypointsLoaded(getMockWaypoints());
    }
  };

  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log("Geolocation not supported, using default location");
        resolve(DEFAULT_CENTER);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation error:", error.message, "- using default location");
          resolve(DEFAULT_CENTER);
        },
        {
          timeout: 5000,
          maximumAge: 300000, // Cache for 5 minutes
        },
      );
    });
  };

  const getMockWaypoints = (): Waypoint[] => {
    // Fallback mock waypoints around San Francisco
    return [
      {
        id: "waypoint-0",
        name: "Union Square",
        location: { lat: 37.7879, lng: -122.4075 },
        address: "Union Square, San Francisco, CA",
      },
      {
        id: "waypoint-1",
        name: "Ferry Building",
        location: { lat: 37.7956, lng: -122.3933 },
        address: "Ferry Building, San Francisco, CA",
      },
      {
        id: "waypoint-2",
        name: "Fisherman's Wharf",
        location: { lat: 37.808, lng: -122.4177 },
        address: "Fisherman's Wharf, San Francisco, CA",
      },
      {
        id: "waypoint-3",
        name: "Golden Gate Park",
        location: { lat: 37.7694, lng: -122.4862 },
        address: "Golden Gate Park, San Francisco, CA",
      },
      {
        id: "waypoint-4",
        name: "Mission District",
        location: { lat: 37.7599, lng: -122.4148 },
        address: "Mission District, San Francisco, CA",
      },
      {
        id: "waypoint-5",
        name: "Alamo Square",
        location: { lat: 37.7766, lng: -122.4341 },
        address: "Alamo Square, San Francisco, CA",
      },
    ];
  };

  const handleWaypointClick = useCallback((waypoint: Waypoint) => {
    setUserSelectedWaypoints((prev) => {
      // Check against current state, not stale closure
      if (prev.find((w) => w.id === waypoint.id)) {
        // Already selected, remove it
        return prev.filter((w) => w.id !== waypoint.id);
      } else {
        // Add to selection
        return [...prev, waypoint];
      }
    });
  }, []);

  const handleRemoveWaypoint = useCallback((waypointId: string) => {
    setUserSelectedWaypoints((prev) => prev.filter((w) => w.id !== waypointId));
  }, []);

  const handleAddCustomWaypoint = useCallback(
    (waypoint: Waypoint) => {
      if (availableWaypoints.length >= 10) {
        setError("Maximum 10 waypoints allowed");
        return;
      }

      // Check if this waypoint already exists (by placeId or by coordinates)
      const isDuplicate = availableWaypoints.some((w) => {
        if (w.placeId && waypoint.placeId && w.placeId === waypoint.placeId) {
          return true;
        }
        // Also check by location (within ~10 meters)
        const latMatch = Math.abs(w.location.lat - waypoint.location.lat) < 0.0001;
        const lngMatch = Math.abs(w.location.lng - waypoint.location.lng) < 0.0001;
        return latMatch && lngMatch;
      });

      if (isDuplicate) {
        setError("This location is already in your waypoints");
        setTimeout(() => setError(null), 3000);
        return;
      }

      onWaypointsLoaded([...availableWaypoints, waypoint]);
    },
    [availableWaypoints, onWaypointsLoaded],
  );

  const handleStartRace = async () => {
    if (userSelectedWaypoints.length < 2) {
      setError("Select at least 2 waypoints to create a route");
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const directionsService = new google.maps.DirectionsService();

      // Get start location (map center or user's location)
      const startLocation = await getUserLocation();
      const startWaypoint: Waypoint = {
        id: "start",
        name: "Start Location",
        location: startLocation,
      };

      // Calculate user's route (in the order they selected)
      // All selected waypoints except the last are intermediate stops
      const userWaypoints = userSelectedWaypoints.slice(0, -1).map((wp) => ({
        location: new google.maps.LatLng(wp.location.lat, wp.location.lng),
        stopover: true,
      }));

      const userRequest: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(startLocation.lat, startLocation.lng),
        destination: new google.maps.LatLng(
          userSelectedWaypoints[userSelectedWaypoints.length - 1].location.lat,
          userSelectedWaypoints[userSelectedWaypoints.length - 1].location.lng,
        ),
        waypoints: userWaypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      };

      // Calculate optimal route (with optimization)
      const optimalRequest: google.maps.DirectionsRequest = {
        ...userRequest,
        optimizeWaypoints: true,
      };

      const [userResult, optimalResult] = await Promise.all([
        new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(userRequest, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`User route failed: ${status}`));
            }
          });
        }),
        new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(optimalRequest, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Optimal route failed: ${status}`));
            }
          });
        }),
      ]);

      // Calculate total distance and duration for user route
      let userDistance = 0;
      let userDuration = 0;
      userResult.routes[0].legs.forEach((leg) => {
        userDistance += leg.distance?.value || 0;
        userDuration += leg.duration?.value || 0;
      });

      // Calculate total distance and duration for optimal route
      let optimalDistance = 0;
      let optimalDuration = 0;
      optimalResult.routes[0].legs.forEach((leg) => {
        optimalDistance += leg.distance?.value || 0;
        optimalDuration += leg.duration?.value || 0;
      });

      // Get waypoint order from optimal route
      const waypointOrder = optimalResult.routes[0].waypoint_order || [];

      // Build user's waypoints with start location prepended
      const userRouteWaypoints = [startWaypoint, ...userSelectedWaypoints];

      // Build optimal waypoints in the optimized order with start location prepended
      const optimalWaypoints = [
        startWaypoint, // start location
        ...waypointOrder.map((index) => userSelectedWaypoints[index]), // reordered waypoints
        userSelectedWaypoints[userSelectedWaypoints.length - 1], // destination
      ];

      onStartRace(
        {
          waypoints: userRouteWaypoints,
          distance: userDistance,
          duration: userDuration,
        },
        {
          waypoints: optimalWaypoints,
          distance: optimalDistance,
          duration: optimalDuration,
          waypointOrder,
        },
      );
    } catch (err) {
      console.error("Error calculating routes:", err);
      setError("Failed to calculate routes. Please try again.");
      setIsCalculating(false);
    }
  };

  const canStartRace = userSelectedWaypoints.length >= 2 && !isCalculating;

  return (
    <div className="game-board">
      <aside className="game-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <div className="character-badge" style={{ backgroundColor: character.color }}>
            <span className="character-badge-emoji">{character.emoji}</span>
            <span className="character-badge-name">{character.name}</span>
          </div>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        {gameState === "waypoint-loading" && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Finding nearby locations...</p>
          </div>
        )}

        {gameState === "route-building" && (
          <>
            <div className="instructions">
              <h3>🎯 Build Your Route</h3>
              <p>
                Click waypoints on the map in the order you want to visit them. You'll start from your current location.
              </p>
              <p className="instruction-highlight">
                {userSelectedWaypoints.length === 0 && "Select your first stop!"}
                {userSelectedWaypoints.length === 1 && "Choose your next stop..."}
                {userSelectedWaypoints.length >= 2 &&
                  `${userSelectedWaypoints.length} stops selected. Add more or race!`}
              </p>
            </div>

            {mode === "custom" && (
              <WaypointSearch
                map={map}
                existingWaypoints={availableWaypoints}
                onAddWaypoint={handleAddCustomWaypoint}
              />
            )}

            <div className="selected-route">
              <h4 className="route-title">Your Route ({userSelectedWaypoints.length} stops)</h4>
              {userSelectedWaypoints.length === 0 ? (
                <p className="empty-message">No waypoints selected yet</p>
              ) : (
                <div className="route-list">
                  {userSelectedWaypoints.map((waypoint, index) => (
                    <div key={waypoint.id} className="route-item">
                      <div className="route-number">{index + 1}</div>
                      <div className="route-info">
                        <div className="route-name">{waypoint.name}</div>
                        {waypoint.address && <div className="route-address">{waypoint.address}</div>}
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveWaypoint(waypoint.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="start-race-button" onClick={handleStartRace} disabled={!canStartRace}>
              {isCalculating ? (
                <>
                  <span className="button-spinner"></span>
                  Calculating routes...
                </>
              ) : (
                <>🏁 Start Race!</>
              )}
            </button>
          </>
        )}
      </aside>

      <div className="game-map-container">
        <GameMap
          character={character}
          availableWaypoints={availableWaypoints}
          selectedWaypoints={userSelectedWaypoints}
          onWaypointClick={handleWaypointClick}
          onMapReady={setMap}
        />
      </div>
    </div>
  );
}
