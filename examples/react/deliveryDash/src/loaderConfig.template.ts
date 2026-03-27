// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Amazon Location Service Loader Configuration Generated from loaderConfig.template.ts */

// ⭐ Import from Amazon Location Migration SDK
// In production, this would be: import { Loader } from '@aws/amazon-location-migration-sdk';
import { Loader } from "../../../../dist/esm/index";

// ⭐ Configuration (includes region for Amazon Location)
const loaderConfig = {
  apiKey: "{{AMAZON_LOCATION_API_KEY}}",
  region: "{{REGION}}",
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

/** Initialize Google Maps (via Amazon Location Migration SDK) */
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
