export interface LatLng {
  lat: number;
  lng: number;
}

export interface Waypoint {
  id: string;
  name: string;
  location: LatLng;
  address?: string;
  placeId?: string;
  type?: string;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export type GameMode = "quick-start" | "custom";
export type GameState = "mode-selection" | "waypoint-loading" | "route-building" | "racing" | "results";

export interface UserRoute {
  waypoints: Waypoint[];
  polyline?: google.maps.Polyline;
  distance?: number;
  duration?: number;
}

export interface OptimalRoute {
  waypoints: Waypoint[];
  polyline?: google.maps.Polyline;
  distance: number;
  duration: number;
  waypointOrder: number[];
}

export interface RaceProgress {
  userProgress: number; // 0-1
  optimalProgress: number; // 0-1
  userPosition: LatLng;
  optimalPosition: LatLng;
}

export interface RaceResult {
  userDistance: number; // meters
  userDuration: number; // seconds
  optimalDistance: number; // meters
  optimalDuration: number; // seconds
  timeSaved: number; // seconds (negative if user was slower)
  efficiency: number; // percentage (0-100+)
  userWon: boolean;
}
