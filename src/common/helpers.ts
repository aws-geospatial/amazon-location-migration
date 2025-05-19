// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ControlPosition, LngLatBounds, LngLat } from "maplibre-gl";

import { GoogleToMaplibreControlPosition } from "./defines";

export const convertGoogleControlPositionToMapLibre = (controlPosition: number | null): ControlPosition | null => {
  if (!controlPosition) {
    return null;
  }

  if (controlPosition in GoogleToMaplibreControlPosition) {
    return GoogleToMaplibreControlPosition[controlPosition];
  }

  // If we reach here, we don't have a mapping for this control position
  console.warn("Unsupported controlPosition:", controlPosition);
  return null;
};

export interface RouteMatrixPosition {
  Position: number[]; // [lat, lng]
}

export function createProgressiveBounds(
  origins: RouteMatrixPosition[],
  destinations: RouteMatrixPosition[]
): [number, number, number, number] { // [sw_lng, sw_lat, ne_lng, ne_lat]
  if (origins.length !== destinations.length) {
    throw new Error('Origin and destination arrays must be of equal length');
  }

  const bounds = new LngLatBounds();

  origins.forEach(origin => {
    const [lat, lng] = origin.Position;
    // Convert to lng,lat for MapLibre
    bounds.extend([lng, lat]);
  });

  destinations.forEach(destination => {
    const [lat, lng] = destination.Position;
    // Convert to lng,lat for MapLibre
    bounds.extend([lng, lat]);
  });

  return [
    bounds.getWest(),    // southwest longitude
    bounds.getSouth(),   // southwest latitude
    bounds.getEast(),    // northeast longitude
    bounds.getNorth()    // northeast latitude
  ];
}


