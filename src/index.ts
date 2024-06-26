// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { LocationClient } from "@aws-sdk/client-location";

import { MigrationDirectionsRenderer, MigrationDirectionsService, TravelMode, UnitSystem } from "./directions";
import {
  DirectionsStatus,
  MigrationControlPosition,
  MigrationLatLng,
  MigrationLatLngBounds,
  PlacesServiceStatus,
} from "./googleCommon";
import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";
import {
  MigrationAutocomplete,
  MigrationAutocompleteService,
  MigrationPlacesService,
  MigrationSearchBox,
} from "./places";
import { MigrationInfoWindow } from "./infoWindow";
import { addListener, addListenerOnce, removeListener } from "./events";

// Dynamically load the MapLibre and MapLibre Geocoder stylesheets so that our migration adapter is the only thing our users need to import
// Without this, many MapLibre rendering features won't work (e.g. markers and info windows won't be visible)
// Also the MapLibre Geocoder input field won't function properly
const maplibreStyle = document.createElement("link");
maplibreStyle.setAttribute("rel", "stylesheet");
maplibreStyle.setAttribute("href", "https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css");
document.head.appendChild(maplibreStyle);
const maplibreGeocoderStyle = document.createElement("link");
maplibreGeocoderStyle.setAttribute("rel", "stylesheet");
maplibreGeocoderStyle.setAttribute(
  "href",
  "https://www.unpkg.com/@aws/amazon-location-for-maplibre-gl-geocoder@1.x/dist/amazon-location-for-mlg-styles.css",
);
document.head.appendChild(maplibreGeocoderStyle);

// Parse URL params from the query string this script was imported with so we can retrieve
// params (e.g. API key, place index, etc...)
const currentScript = document.currentScript as HTMLScriptElement;
const currentScriptSrc = currentScript.src;
const queryString = currentScriptSrc.substring(currentScriptSrc.indexOf("?"));
const urlParams = new URLSearchParams(queryString);

// API key is required to be passed in, so if it's not we need to log an error and bail out
// TODO: Add cognito support as well
const apiKey = urlParams.get("apiKey");

// Optional, the region to be used (us-west-2 by default)
const defaultRegion = "us-west-2";
const region = urlParams.get("region") || defaultRegion;

// Optional, but if user wants to perform any Places requests, this is required
const placeIndexName = urlParams.get("placeIndex");

// Optional, but if user wants to perform any Route requests, this is required
const routeCalculatorName = urlParams.get("routeCalculator");

// Optional, will invoke after migrationInit has finished executing
const postMigrationCallback = urlParams.get("callback");

// Optional, but if user wants to use a Map, this is required
const mapName = urlParams.get("map");

// Style URL is used by the Map for making requests
const styleUrl = `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`;

const migrationInit = async function () {
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
  MigrationAutocomplete.prototype._client = client;
  MigrationAutocomplete.prototype._placeIndexName = placeIndexName;
  MigrationAutocompleteService.prototype._client = client;
  MigrationAutocompleteService.prototype._placeIndexName = placeIndexName;
  MigrationPlacesService.prototype._client = client;
  MigrationPlacesService.prototype._placeIndexName = placeIndexName;
  MigrationSearchBox.prototype._client = client;
  MigrationSearchBox.prototype._placeIndexName = placeIndexName;
  MigrationDirectionsService.prototype._client = client;
  MigrationDirectionsService.prototype._routeCalculatorName = routeCalculatorName;

  // Additionally, we need to create a places service for our directions service
  // to use, since it can optionally be passed source/destinations that are string
  // queries instead of actual LatLng coordinates. Constructing it here and passing
  // it in will make sure it is already configured with the appropriate client
  // and place index name.
  MigrationDirectionsService.prototype._placesService = new MigrationPlacesService();

  // Create the Google Maps namespace with our migration classes
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  (window as any).google = {
    maps: {
      LatLng: MigrationLatLng,
      LatLngBounds: MigrationLatLngBounds,

      Map: MigrationMap,
      Marker: MigrationMarker,
      marker: {
        AdvancedMarkerElement: MigrationMarker,
      },
      InfoWindow: MigrationInfoWindow,
      ControlPosition: MigrationControlPosition,

      DirectionsRenderer: MigrationDirectionsRenderer,
      DirectionsService: MigrationDirectionsService,
      DirectionsStatus: DirectionsStatus,
      TravelMode: TravelMode,
      UnitSystem: UnitSystem,

      places: {
        Autocomplete: MigrationAutocomplete,
        AutocompleteService: MigrationAutocompleteService,
        PlacesService: MigrationPlacesService,
        PlacesServiceStatus: PlacesServiceStatus,
        SearchBox: MigrationSearchBox,
      },

      event: {
        addListener: addListener,
        addListenerOnce: addListenerOnce,
        removeListener: removeListener,
      },

      // Handle dynamic imports, e.g. const { Map } = await google.maps.importLibrary("maps");
      importLibrary: (library) => {
        return new Promise((resolve) => {
          switch (library) {
            case "core":
              resolve({
                ControlPosition: MigrationControlPosition,
                LatLng: MigrationLatLng,
                LatLngBounds: MigrationLatLngBounds,
                addListener: addListener,
                addListenerOnce: addListenerOnce,
                removeListener: removeListener,
              });
              break;

            case "maps":
              resolve({
                InfoWindow: MigrationInfoWindow,
                Map: MigrationMap,
              });
              break;

            case "places":
              resolve({
                Autocomplete: MigrationAutocomplete,
                AutocompleteService: MigrationAutocompleteService,
                PlacesService: MigrationPlacesService,
                PlacesServiceStatus: PlacesServiceStatus,
                SearchBox: MigrationSearchBox,
              });
              break;

            case "routes":
              resolve({
                DirectionsRenderer: MigrationDirectionsRenderer,
                DirectionsService: MigrationDirectionsService,
                DirectionsStatus: DirectionsStatus,
                TravelMode: TravelMode,
              });
              break;

            case "marker":
              resolve({
                AdvancedMarkerElement: MigrationMarker,
                Marker: MigrationMarker,
              });
              break;

            default:
              console.error(`Unsupported library: ${library}`);
              resolve({});
              break;
          }
        });
      },
    },
  };

  if (postMigrationCallback) {
    window[postMigrationCallback]();
  }
};

migrationInit();
