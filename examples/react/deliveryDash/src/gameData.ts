import { Character, LatLng } from "./types";

// Available characters for the game
export const CHARACTERS: Character[] = [
  {
    id: "pizza-driver",
    name: "Pizza Pro",
    emoji: "🍕",
    color: "#D32F2F",
    description: "Fast pizza delivery expert",
  },
  {
    id: "package-courier",
    name: "Package Courier",
    emoji: "📦",
    color: "#1976D2",
    description: "Speedy package delivery driver",
  },
  {
    id: "truck-driver",
    name: "Truck Driver",
    emoji: "🚚",
    color: "#388E3C",
    description: "Heavy-duty freight hauler",
  },
  {
    id: "car-driver",
    name: "Car Captain",
    emoji: "🚗",
    color: "#F57C00",
    description: "Professional car driver",
  },
];

// Default center for San Francisco
export const DEFAULT_CENTER: LatLng = {
  lat: 37.7749,
  lng: -122.4194,
};

// Helper to create marker icon SVG
export function createCharacterMarker(emoji: string, color: string, size: number = 48): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="${size / 2}" y="${size / 2 + size / 6}" font-size="${
    size / 2
  }" text-anchor="middle" fill="white">${emoji}</text>
    </svg>
  `)}`;
}

// Helper to create waypoint marker SVG
export function createWaypointMarker(number: number | null, color: string = "#9C27B0", size: number = 40): string {
  const content = number !== null ? number.toString() : "📍";
  const yOffset = number !== null ? 6 : 8;
  const fontSize = number !== null ? 18 : 20;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="${size / 2}" y="${
    size / 2 + yOffset
  }" font-size="${fontSize}" text-anchor="middle" fill="white" font-weight="bold">${content}</text>
    </svg>
  `)}`;
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Interpolate position along a path
export function interpolateAlongPath(
  path: google.maps.LatLng[],
  progress: number, // 0-1
): LatLng {
  if (path.length === 0) return DEFAULT_CENTER;
  if (progress <= 0) return { lat: path[0].lat(), lng: path[0].lng() };
  if (progress >= 1) {
    const last = path[path.length - 1];
    return { lat: last.lat(), lng: last.lng() };
  }

  // Calculate total path length
  let totalDistance = 0;
  const segmentDistances: number[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
    segmentDistances.push(distance);
    totalDistance += distance;
  }

  // Find target distance
  const targetDistance = totalDistance * progress;
  let coveredDistance = 0;

  // Find which segment contains the target point
  for (let i = 0; i < segmentDistances.length; i++) {
    if (coveredDistance + segmentDistances[i] >= targetDistance) {
      // Target is in this segment
      const segmentProgress = (targetDistance - coveredDistance) / segmentDistances[i];
      const start = path[i];
      const end = path[i + 1];

      // Interpolate between start and end
      const lat = start.lat() + (end.lat() - start.lat()) * segmentProgress;
      const lng = start.lng() + (end.lng() - start.lng()) * segmentProgress;

      return { lat, lng };
    }
    coveredDistance += segmentDistances[i];
  }

  // Fallback to last point
  const last = path[path.length - 1];
  return { lat: last.lat(), lng: last.lng() };
}

// Calculate efficiency percentage
export function calculateEfficiency(userDuration: number, optimalDuration: number): number {
  if (optimalDuration === 0) return 100;
  return Math.round((optimalDuration / userDuration) * 100);
}
