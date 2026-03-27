import { useState, useRef, useEffect } from "react";
import { Waypoint } from "../types";
import { DEFAULT_CENTER } from "../gameData";

interface WaypointSearchProps {
  map: google.maps.Map | null;
  existingWaypoints: Waypoint[];
  onAddWaypoint: (waypoint: Waypoint) => void;
}

// Counter to ensure unique IDs even when created in rapid succession
let waypointIdCounter = 0;

export default function WaypointSearch({ map, existingWaypoints, onAddWaypoint }: WaypointSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.QueryAutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showNearbySearch, setShowNearbySearch] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    if (!map) return;

    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
  }, [map]);

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  const searchPlaces = (query: string) => {
    if (!autocompleteServiceRef.current || !map) return;

    const center = map.getCenter() || new google.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

    autocompleteServiceRef.current.getQueryPredictions(
      {
        input: query,
        location: center,
        radius: 10000, // 10km bias
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Filter to only show predictions that have a place_id (actual places, not just query suggestions)
          const placePredictions = results.filter((prediction) => prediction.place_id);
          setPredictions(placePredictions);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      },
    );
  };

  const handleSelectPrediction = async (placeId: string) => {
    try {
      // Use new Place API
      const place = new google.maps.places.Place({
        id: placeId,
      });

      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "id", "types"],
      });

      if (place.location) {
        const waypoint: Waypoint = {
          id: `custom-${Date.now()}-${++waypointIdCounter}`,
          name: place.displayName || "Custom Location",
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          address: place.formattedAddress,
          placeId: place.id,
          type: place.types?.[0],
        };

        onAddWaypoint(waypoint);
        setSearchQuery("");
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const handleNearbySearch = async (type: string) => {
    if (!map) return;

    const center = map.getCenter() || new google.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

    try {
      // Use new Place API searchNearby
      const request = {
        fields: ["displayName", "formattedAddress", "location", "id", "types"],
        locationRestriction: {
          center: center,
          radius: 2000,
        },
        includedTypes: [type],
        maxResultCount: 10,
      };

      const { places } = await google.maps.places.Place.searchNearby(request);

      if (places && places.length > 0) {
        // Add first result that's not already in the list
        for (const place of places) {
          const alreadyExists = existingWaypoints.some((w) => w.placeId === place.id);

          if (!alreadyExists && place.location) {
            const waypoint: Waypoint = {
              id: `nearby-${Date.now()}-${++waypointIdCounter}`,
              name: place.displayName || "Nearby Place",
              location: {
                lat: place.location.lat(),
                lng: place.location.lng(),
              },
              address: place.formattedAddress,
              placeId: place.id,
              type: type,
            };

            onAddWaypoint(waypoint);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error searching nearby places:", error);
    }

    setShowNearbySearch(false);
  };

  return (
    <div className="waypoint-search">
      <h4 className="search-title">Add Waypoints</h4>

      <div className="search-input-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowPredictions(true)}
          onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
          placeholder="Search for a location..."
          className="search-input"
          disabled={existingWaypoints.length >= 10}
        />
        {showPredictions && predictions.length > 0 && (
          <div className="predictions-dropdown">
            {predictions.map((prediction) => {
              // For QueryAutocompletePrediction, use terms to get main text and secondary text
              const mainText =
                prediction.terms && prediction.terms.length > 0 ? prediction.terms[0].value : prediction.description;
              const secondaryText =
                prediction.terms && prediction.terms.length > 1
                  ? prediction.terms
                      .slice(1)
                      .map((t) => t.value)
                      .join(", ")
                  : "";

              return (
                <div
                  key={prediction.place_id}
                  className="prediction-item"
                  onClick={() => handleSelectPrediction(prediction.place_id!)}
                >
                  <div className="prediction-name">{mainText}</div>
                  {secondaryText && <div className="prediction-address">{secondaryText}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="search-actions">
        <button
          className="nearby-search-toggle"
          onClick={() => setShowNearbySearch(!showNearbySearch)}
          disabled={existingWaypoints.length >= 10}
        >
          {showNearbySearch ? "✕ Close" : "📍 Find Nearby"}
        </button>

        {existingWaypoints.length >= 10 && <p className="limit-message">Maximum 10 waypoints reached</p>}
      </div>

      {showNearbySearch && (
        <div className="nearby-search-buttons">
          <button className="nearby-button" onClick={() => handleNearbySearch("restaurant")}>
            🍽️ Restaurant
          </button>
          <button className="nearby-button" onClick={() => handleNearbySearch("cafe")}>
            ☕ Cafe
          </button>
          <button className="nearby-button" onClick={() => handleNearbySearch("store")}>
            🛒 Store
          </button>
          <button className="nearby-button" onClick={() => handleNearbySearch("gas_station")}>
            ⛽ Gas Station
          </button>
          <button className="nearby-button" onClick={() => handleNearbySearch("park")}>
            🌳 Park
          </button>
          <button className="nearby-button" onClick={() => handleNearbySearch("atm")}>
            🏧 ATM
          </button>
        </div>
      )}
    </div>
  );
}
