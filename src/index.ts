// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { LocationClient } from "@aws-sdk/client-location";

import { MigrationDirectionsRenderer, MigrationDirectionsService } from "./directions";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import { MigrationAutocompleteService, MigrationPlacesService } from "./places";

// Dynamically load the MapLibre stylesheet so that our migration adapter is the only thing our users need to import
// Without this, many MapLibre rendering features won't work (e.g. markers and info windows won't be visible)
const style = document.createElement("link");
style.setAttribute("rel", "stylesheet");
style.setAttribute("href", "https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css");
document.head.appendChild(style);

// Parse URL params from the query string this script was imported with so we can retrieve
// params (e.g. API key, place index, etc...)
const currentScript = document.currentScript as HTMLScriptElement;
const currentScriptSrc = currentScript.src;
const queryString = currentScriptSrc.substring(currentScriptSrc.indexOf("?"));
const urlParams = new URLSearchParams(queryString);

// API key is required to be passed in, so if it's not we need to log an error and bail out
const apiKey = urlParams.get("apiKey");
if (!apiKey) {
  throw Error("Migration script missing 'apiKey' parameter.");
}

// Optional, the region to be used (us-west-2 by default)
const defaultRegion = "us-west-2";
const region = urlParams.get("region") || defaultRegion;

// Optional, but if user wants to perform any Places requests, this is required
const placeIndexName = urlParams.get("placeIndex");

// Optional, but if user wants to perform any Route requests, this is required
const routeCalculatorName = urlParams.get("routeCalculator");

// Optional, will invoke after migrationInit has been called
const postMigrationCallback = urlParams.get("callback");

// Optional, but if user wants to use a Map, this is required
const mapName = urlParams.get("map" || "UNKNOWN_MAP_NAME");

// Style URL is used by the Map for making requests
const styleUrl = `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).migrationInit = async function () {
  // Pass our style url (which includes the API key) to our Migration Map class
  MigrationMap.prototype._styleUrl = styleUrl;

  // Create an authentication helper instance using an API key
  const authHelper = await withAPIKey(apiKey);

  const client = new LocationClient({
    region: region, // Region containing Amazon Location resource
    ...authHelper.getLocationClientConfig(), // Configures the client to use API keys when making supported requests
  });

  // Pass our location client, and optionally place index and route calculator names
  // to our migration services
  MigrationAutocompleteService.prototype._client = client;
  MigrationAutocompleteService.prototype._placeIndexName = placeIndexName;
  MigrationPlacesService.prototype._client = client;
  MigrationPlacesService.prototype._placeIndexName = placeIndexName;
  MigrationDirectionsService.prototype._client = client;
  MigrationDirectionsService.prototype._routeCalculatorName = routeCalculatorName;

  // Additionally, we need to create a places service for our directions service
  // to use, since it can optionally be passed source/destinations that are string
  // queries instead of actual LatLng coordinates. Constructing it here and passing
  // it in will make sure it is already configured with the appropriate client
  // and place index name.
  MigrationDirectionsService.prototype._placesService = new MigrationPlacesService();

  // Replace the Google Maps classes with our migration classes
  (window as any).google.maps.Map = MigrationMap;
  (window as any).google.maps.Marker = MigrationMarker;

  (window as any).google.maps.places.AutocompleteService = MigrationAutocompleteService;
  (window as any).google.maps.places.PlacesService = MigrationPlacesService;

  (window as any).google.maps.DirectionsRenderer = MigrationDirectionsRenderer;
  (window as any).google.maps.DirectionsService = MigrationDirectionsService;

  if (postMigrationCallback) {
    window[postMigrationCallback]();
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
