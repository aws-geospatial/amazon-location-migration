import { useEffect, useRef, useState } from "react";
import { Character, UserRoute, OptimalRoute, RaceResult, RaceProgress } from "../types";
import { useMapInit } from "../MapConfigContext";
import {
  createCharacterMarker,
  interpolateAlongPath,
  formatDistance,
  formatDuration,
  calculateEfficiency,
} from "../gameData";

interface RaceViewProps {
  character: Character;
  userRoute: UserRoute;
  optimalRoute: OptimalRoute;
  onRaceComplete: (result: RaceResult) => void;
}

export default function RaceView({ character, userRoute, optimalRoute, onRaceComplete }: RaceViewProps) {
  const initGoogleMaps = useMapInit();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [progress, setProgress] = useState<RaceProgress>({
    userProgress: 0,
    optimalProgress: 0,
    userPosition: userRoute.waypoints[0].location,
    optimalPosition: optimalRoute.waypoints[0].location,
  });
  const [raceStarted, setRaceStarted] = useState(false);
  const [showUserRoute, setShowUserRoute] = useState(true);
  const [showOptimalRoute, setShowOptimalRoute] = useState(true);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  const userPolylineRef = useRef<google.maps.Polyline | null>(null);
  const optimalPolylineRef = useRef<google.maps.Polyline | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Initialize map and draw routes
  useEffect(() => {
    if (!mapRef.current || map || isInitializedRef.current) return;
    isInitializedRef.current = true;

    initGoogleMaps().then(() => {
      const directionsService = new google.maps.DirectionsService();

      // Request both routes
      const userWaypoints = userRoute.waypoints.slice(1, -1).map((wp) => ({
        location: new google.maps.LatLng(wp.location.lat, wp.location.lng),
        stopover: true,
      }));

      const optimalWaypoints = optimalRoute.waypoints.slice(1, -1).map((wp) => ({
        location: new google.maps.LatLng(wp.location.lat, wp.location.lng),
        stopover: true,
      }));

      Promise.all([
        new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin: new google.maps.LatLng(userRoute.waypoints[0].location.lat, userRoute.waypoints[0].location.lng),
              destination: new google.maps.LatLng(
                userRoute.waypoints[userRoute.waypoints.length - 1].location.lat,
                userRoute.waypoints[userRoute.waypoints.length - 1].location.lng,
              ),
              waypoints: userWaypoints,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                reject(new Error("User route failed"));
              }
            },
          );
        }),
        new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin: new google.maps.LatLng(
                optimalRoute.waypoints[0].location.lat,
                optimalRoute.waypoints[0].location.lng,
              ),
              destination: new google.maps.LatLng(
                optimalRoute.waypoints[optimalRoute.waypoints.length - 1].location.lat,
                optimalRoute.waypoints[optimalRoute.waypoints.length - 1].location.lng,
              ),
              waypoints: optimalWaypoints,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                reject(new Error("Optimal route failed"));
              }
            },
          );
        }),
      ]).then(([userResult, optimalResult]) => {
        const newMap = new google.maps.Map(mapRef.current!, {
          center: userRoute.waypoints[0].location,
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        });

        // Draw user route
        const userPolyline = new google.maps.Polyline({
          path: userResult.routes[0].overview_path,
          geodesic: true,
          strokeColor: character.color,
          strokeOpacity: 0.7,
          strokeWeight: 5,
          map: newMap,
        });
        userPolylineRef.current = userPolyline;

        // Draw optimal route
        const optimalPolyline = new google.maps.Polyline({
          path: optimalResult.routes[0].overview_path,
          geodesic: true,
          strokeColor: "#4CAF50",
          strokeOpacity: 0.7,
          strokeWeight: 5,
          map: newMap,
        });
        optimalPolylineRef.current = optimalPolyline;

        // Store paths for animation
        (window as any).userPath = userResult.routes[0].overview_path;
        (window as any).optimalPath = optimalResult.routes[0].overview_path;

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        userResult.routes[0].overview_path.forEach((p) => bounds.extend(p));
        newMap.fitBounds(bounds);

        setMap(newMap);

        // Start race after a short delay
        setTimeout(() => {
          setRaceStarted(true);
          startTimeRef.current = Date.now();
        }, 1000);
      });
    });
  }, []);

  // Handle route visibility toggling
  useEffect(() => {
    if (userPolylineRef.current) {
      userPolylineRef.current.setVisible(showUserRoute);
    }
    if (optimalPolylineRef.current) {
      optimalPolylineRef.current.setVisible(showOptimalRoute);
    }
  }, [showUserRoute, showOptimalRoute]);

  // Animation loop
  useEffect(() => {
    if (!map || !raceStarted) return;

    const userPath = (window as any).userPath as google.maps.LatLng[];
    const optimalPath = (window as any).optimalPath as google.maps.LatLng[];

    if (!userPath || !optimalPath) return;

    // Create markers
    const userMarker = new google.maps.Marker({
      position: userPath[0],
      map: map,
      icon: {
        url: createCharacterMarker(character.emoji, character.color, 56),
        scaledSize: new google.maps.Size(56, 56),
        anchor: new google.maps.Point(28, 28),
      },
      zIndex: 999,
    });

    const optimalMarker = new google.maps.Marker({
      position: optimalPath[0],
      map: map,
      icon: {
        url: createCharacterMarker("🤖", "#4CAF50", 64),
        scaledSize: new google.maps.Size(64, 64),
        anchor: new google.maps.Point(32, 32),
      },
      opacity: 0.5,
      zIndex: 1000,
    });

    // Animation function
    const RACE_DURATION = 8000; // 8 seconds for the race

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current!;
      const optimalProgress = Math.min(elapsed / RACE_DURATION, 1);
      const userProgress = Math.min((elapsed / RACE_DURATION) * (optimalRoute.duration / userRoute.duration!), 1);

      const userPosition = interpolateAlongPath(userPath, userProgress);
      const optimalPosition = interpolateAlongPath(optimalPath, optimalProgress);

      userMarker.setPosition(new google.maps.LatLng(userPosition.lat, userPosition.lng));
      optimalMarker.setPosition(new google.maps.LatLng(optimalPosition.lat, optimalPosition.lng));

      // Only update progress state every 50ms to avoid overwhelming React
      if (now - lastProgressUpdateRef.current >= 50) {
        setProgress({
          userProgress,
          optimalProgress,
          userPosition,
          optimalPosition,
        });
        lastProgressUpdateRef.current = now;
      }

      if (userProgress < 1 || optimalProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Race complete - ensure final progress update
        setProgress({
          userProgress: 1,
          optimalProgress: 1,
          userPosition,
          optimalPosition,
        });

        const timeSaved = (userRoute.duration || 0) - optimalRoute.duration;
        const result: RaceResult = {
          userDistance: userRoute.distance || 0,
          userDuration: userRoute.duration || 0,
          optimalDistance: optimalRoute.distance,
          optimalDuration: optimalRoute.duration,
          timeSaved,
          efficiency: calculateEfficiency(userRoute.duration || 0, optimalRoute.duration),
          userWon: timeSaved <= 0,
        };

        setTimeout(() => {
          onRaceComplete(result);
        }, 1000);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      userMarker.setMap(null);
      optimalMarker.setMap(null);
    };
  }, [map, raceStarted, character, userRoute, optimalRoute, onRaceComplete]);

  const userRemaining = userRoute.duration ? (1 - progress.userProgress) * userRoute.duration : 0;
  const optimalRemaining = (1 - progress.optimalProgress) * optimalRoute.duration;

  return (
    <div className="race-view">
      <div className="race-header">
        <div className="racer-info user-racer" style={{ backgroundColor: character.color }}>
          <label className="route-toggle">
            <input type="checkbox" checked={showUserRoute} onChange={(e) => setShowUserRoute(e.target.checked)} />
            <span className="toggle-label">Show Route</span>
          </label>
          <span className="racer-emoji">{character.emoji}</span>
          <div className="racer-details">
            <div className="racer-name">Your Route</div>
            <div className="racer-stats">
              <span>📏 {formatDistance(userRoute.distance || 0)}</span>
              <span>⏱️ {formatDuration(userRemaining)}</span>
            </div>
            <div className="racer-progress">
              <div className="progress-fill" style={{ width: `${progress.userProgress * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="race-vs">VS</div>

        <div className="racer-info optimal-racer" style={{ backgroundColor: "#4CAF50" }}>
          <label className="route-toggle">
            <input type="checkbox" checked={showOptimalRoute} onChange={(e) => setShowOptimalRoute(e.target.checked)} />
            <span className="toggle-label">Show Route</span>
          </label>
          <span className="racer-emoji">🤖</span>
          <div className="racer-details">
            <div className="racer-name">Robot Optimal</div>
            <div className="racer-stats">
              <span>📏 {formatDistance(optimalRoute.distance)}</span>
              <span>⏱️ {formatDuration(optimalRemaining)}</span>
            </div>
            <div className="racer-progress">
              <div className="progress-fill" style={{ width: `${progress.optimalProgress * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div ref={mapRef} className="race-map" />
    </div>
  );
}
