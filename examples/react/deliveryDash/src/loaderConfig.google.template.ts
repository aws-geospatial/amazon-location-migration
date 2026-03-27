// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Google Maps Loader Configuration Generated from loaderConfig.google.template.ts */

// ⭐ Import from Google's official loader
import { Loader } from "@googlemaps/js-api-loader";

// ⭐ Configuration (no region needed for Google)
const loaderConfig = {
  apiKey: "{{GOOGLE_API_KEY}}",
  version: "weekly",
  libraries: ["places", "geometry", "marker"],
} as const;

let googleMapsLoader: Loader | null = null;
let loadingPromise: Promise<any> | null = null;
let googleMapsLibraries: {
  maps?: typeof google.maps;
  places?: google.maps.PlacesLibrary;
  geometry?: google.maps.GeometryLibrary;
  marker?: google.maps.MarkerLibrary;
} = {};

/** Initialize Google Maps (via official Google Maps loader) */
export async function initGoogleMaps() {
  // If already loaded, return immediately
  if (googleMapsLoader && googleMapsLibraries.maps) {
    return googleMapsLibraries;
  }

  // If currently loading, wait for the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  googleMapsLoader = new Loader(loaderConfig);

  loadingPromise = (async () => {
    try {
      const google = await googleMapsLoader!.load();
      googleMapsLibraries.maps = google.maps;

      // Load additional libraries
      const [placesLib, geometryLib, markerLib] = await Promise.all([
        google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
        google.maps.importLibrary("geometry") as Promise<google.maps.GeometryLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
      ]);

      googleMapsLibraries.places = placesLib;
      googleMapsLibraries.geometry = geometryLib;
      googleMapsLibraries.marker = markerLib;

      return googleMapsLibraries;
    } catch (error) {
      console.error("Error loading Google Maps:", error);
      loadingPromise = null; // Reset so it can be retried
      throw error;
    }
  })();

  return loadingPromise;
}

export function getGoogleMapsLibraries() {
  return googleMapsLibraries;
}
