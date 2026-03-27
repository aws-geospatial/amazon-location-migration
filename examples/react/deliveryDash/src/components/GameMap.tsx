import { useEffect, useRef, useState } from "react";
import { Character, Waypoint } from "../types";
import { useMapInit } from "../MapConfigContext";
import { createWaypointMarker, DEFAULT_CENTER } from "../gameData";

interface GameMapProps {
  character: Character;
  availableWaypoints: Waypoint[];
  selectedWaypoints: Waypoint[];
  onWaypointClick: (waypoint: Waypoint) => void;
  onMapReady: (map: google.maps.Map) => void;
}

export default function GameMap({
  character,
  availableWaypoints,
  selectedWaypoints,
  onWaypointClick,
  onMapReady,
}: GameMapProps) {
  const initGoogleMaps = useMapInit();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<{ [key: string]: google.maps.Marker }>({});
  const [routeLine, setRouteLine] = useState<google.maps.Polyline | null>(null);
  const [startMarker, setStartMarker] = useState<google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    initGoogleMaps()
      .then(async () => {
        // Try to get user's location for initial center
        const center = await getUserLocation();

        const newMap = new google.maps.Map(mapRef.current!, {
          center: center,
          zoom: 13,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          zoomControl: true,
        });

        setMap(newMap);
        onMapReady(newMap);
      })
      .catch((error) => {
        console.error("Failed to initialize Google Maps:", error);
      });
  }, [map, onMapReady]);

  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
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
        () => {
          resolve(DEFAULT_CENTER);
        },
        {
          timeout: 5000,
          maximumAge: 300000,
        },
      );
    });
  };

  // Create start location marker
  useEffect(() => {
    if (!map || startMarker) return;

    getUserLocation().then((startLocation) => {
      // Create start marker icon (green flag)
      const startIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#4CAF50" stroke="white" stroke-width="3"/>
          <text x="24" y="32" font-size="24" text-anchor="middle" fill="white">🏁</text>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        position: startLocation,
        map: map,
        icon: {
          url: startIcon,
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 24),
        },
        title: "Start Location",
        zIndex: 2000,
      });

      setStartMarker(marker);
    });
  }, [map, startMarker]);

  // Create/update waypoint markers
  useEffect(() => {
    if (!map) return;

    const newMarkers: { [key: string]: google.maps.Marker } = { ...markers };

    // Remove markers that are no longer in availableWaypoints
    Object.keys(newMarkers).forEach((key) => {
      if (!availableWaypoints.find((w) => w.id === key)) {
        newMarkers[key].setMap(null);
        delete newMarkers[key];
      }
    });

    // Create or update markers for available waypoints
    availableWaypoints.forEach((waypoint) => {
      const selectedIndex = selectedWaypoints.findIndex((w) => w.id === waypoint.id);
      const isSelected = selectedIndex !== -1;
      const markerNumber = isSelected ? selectedIndex + 1 : null;

      if (newMarkers[waypoint.id]) {
        // Update existing marker
        newMarkers[waypoint.id].setIcon({
          url: createWaypointMarker(markerNumber, isSelected ? character.color : "#9C27B0", isSelected ? 48 : 40),
          scaledSize: new google.maps.Size(isSelected ? 48 : 40, isSelected ? 48 : 40),
          anchor: new google.maps.Point(isSelected ? 24 : 20, isSelected ? 24 : 20),
        });
        newMarkers[waypoint.id].setZIndex(isSelected ? 1000 + selectedIndex : 100);
      } else {
        // Create new marker
        const marker = new google.maps.Marker({
          position: waypoint.location,
          map: map,
          title: waypoint.name,
          icon: {
            url: createWaypointMarker(markerNumber, "#9C27B0", 40),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          zIndex: 100,
        });

        marker.addListener("click", () => {
          onWaypointClick(waypoint);
        });

        newMarkers[waypoint.id] = marker;
      }
    });

    setMarkers(newMarkers);
  }, [map, availableWaypoints, selectedWaypoints, character.color, onWaypointClick]);

  // Draw route line connecting selected waypoints
  useEffect(() => {
    if (!map) return;

    // Remove old route line
    if (routeLine) {
      routeLine.setMap(null);
    }

    // Draw new route line if there are at least 2 selected waypoints
    if (selectedWaypoints.length >= 2) {
      const path = selectedWaypoints.map((w) => new google.maps.LatLng(w.location.lat, w.location.lng));

      const newRouteLine = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: character.color,
        strokeOpacity: 0.6,
        strokeWeight: 4,
        map: map,
      });

      setRouteLine(newRouteLine);
    } else {
      setRouteLine(null);
    }
  }, [map, selectedWaypoints, character.color]);

  // Fit map bounds to show all waypoints
  useEffect(() => {
    if (!map || availableWaypoints.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    availableWaypoints.forEach((waypoint) => {
      bounds.extend(new google.maps.LatLng(waypoint.location.lat, waypoint.location.lng));
    });

    map.fitBounds(bounds);
  }, [map, availableWaypoints]);

  return <div ref={mapRef} className="game-map" />;
}
