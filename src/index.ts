// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { GeoPlacesClient } from "@aws-sdk/client-geo-places";
import { GeoRoutesClient } from "@aws-sdk/client-geo-routes";

import {
  MigrationDirectionsRenderer,
  MigrationDirectionsService,
  MigrationDistanceMatrixService,
  TravelMode,
  UnitSystem,
  DistanceMatrixElementStatus,
  DistanceMatrixStatus,
} from "./directions";
import { MigrationGeocoder } from "./geocoder";
import {
  ColorScheme,
  DirectionsStatus,
  GeocoderStatus,
  MapTypeId,
  MigrationCircle,
  MigrationControlPosition,
  MigrationLatLng,
  MigrationLatLngBounds,
  MigrationMVCObject,
  PlacesServiceStatus,
} from "./common";
import { MigrationInfoWindow, MigrationMap, MigrationMarker } from "./maps";
import {
  AddressComponent,
  MigrationAutocomplete,
  MigrationAutocompleteService,
  MigrationPlace,
  MigrationPlacesService,
  MigrationSearchBox,
  OpeningHours,
  OpeningHoursPeriod,
  OpeningHoursPoint,
  PlusCode,
} from "./places";
import { addListener, addListenerOnce, removeListener } from "./events";
import { PACKAGE_VERSION } from "./version";

// Dynamically load the MapLibre and MapLibre Geocoder stylesheets so that our migration SDK is the only thing our users need to import
// Without this, many MapLibre rendering features won't work (e.g. markers and info windows won't be visible)
// Also the MapLibre Geocoder input field won't function properly
const maplibreStyle = document.createElement("link");
maplibreStyle.setAttribute("rel", "stylesheet");
maplibreStyle.setAttribute("href", "https://cdn.jsdelivr.net/npm/maplibre-gl@5.5.0/dist/maplibre-gl.css");
document.head.appendChild(maplibreStyle);
const maplibreGeocoderStyle = document.createElement("link");
maplibreGeocoderStyle.setAttribute("rel", "stylesheet");
maplibreGeocoderStyle.setAttribute(
  "href",
  "https://cdn.jsdelivr.net/npm/@aws/amazon-location-for-maplibre-gl-geocoder@2.x/dist/amazon-location-for-mlg-styles.css",
);
document.head.appendChild(maplibreGeocoderStyle);

// Top-level entry point that initializes the migration SDK (e.g. populates the Google APIs)
const migrationInit = async function (apiKey: string, region?: string, postMigrationCallback?: string) {
  // The region is optional (us-west-2 by default)
  const defaultRegion = "us-west-2";
  region = region || defaultRegion;

  // Pass our region and API key to our Migration Map class so that it can build the style URL
  MigrationMap.prototype._apiKey = apiKey;
  MigrationMap.prototype._region = region;

  // Create an authentication helper instance using an API key
  const authHelper = await withAPIKey(apiKey);

  const placesClient = new GeoPlacesClient({
    region: region, // Region containing Amazon Location resource
    customUserAgent: `migration-sdk-${PACKAGE_VERSION}`, // Append tag with SDK version to the default user agent
    ...authHelper.getClientConfig(), // Configures the client to use API keys when making supported requests
  });

  const routesClient = new GeoRoutesClient({
    region: region, // Region containing Amazon Location resource
    customUserAgent: `migration-sdk-${PACKAGE_VERSION}`, // Append tag with SDK version to the default user agent
    ...authHelper.getClientConfig(), // Configures the client to use API keys when making supported requests
  });

  // Pass our GeoPlaces/Routes clients to our migration services
  MigrationAutocomplete.prototype._client = placesClient;
  MigrationAutocompleteService.prototype._client = placesClient;
  MigrationGeocoder.prototype._client = placesClient;
  MigrationPlace._client = placesClient;
  MigrationPlacesService.prototype._client = placesClient;
  MigrationSearchBox.prototype._client = placesClient;
  MigrationDirectionsService.prototype._client = routesClient;
  MigrationDistanceMatrixService.prototype._client = routesClient;

  // Additionally, we need to create a places service for our directions service and distance matrix
  // service to use, since it can optionally be passed source/destinations that are string queries
  // instead of actual LatLng coordinates.
  // We also need to create a places service for the Geocoder, which will use it for the
  // address and placeId geocode requests.
  // Constructing it here and passing it in will make sure
  // it is already configured with the appropriate client.
  MigrationDirectionsService.prototype._placesService = new MigrationPlacesService();
  MigrationDistanceMatrixService.prototype._placesService = new MigrationPlacesService();
  MigrationGeocoder.prototype._placesService = new MigrationPlacesService();

  // Create the Google Maps namespace with our migration classes
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  (window as any).google = {
    maps: {
      Circle: MigrationCircle,
      LatLng: MigrationLatLng,
      LatLngBounds: MigrationLatLngBounds,

      ColorScheme: ColorScheme,
      Map: MigrationMap,
      MapTypeId: MapTypeId,
      Marker: MigrationMarker,
      marker: {
        AdvancedMarkerElement: MigrationMarker,
      },
      InfoWindow: MigrationInfoWindow,
      ControlPosition: MigrationControlPosition,

      DirectionsRenderer: MigrationDirectionsRenderer,
      DirectionsService: MigrationDirectionsService,
      DistanceMatrixService: MigrationDistanceMatrixService,
      DirectionsStatus: DirectionsStatus,
      TravelMode: TravelMode,
      UnitSystem: UnitSystem,
      DistanceMatrixElementStatus: DistanceMatrixElementStatus,
      DistanceMatrixStatus: DistanceMatrixStatus,

      Geocoder: MigrationGeocoder,
      GeocoderStatus: GeocoderStatus,

      MVCObject: MigrationMVCObject,

      places: {
        AddressComponent: AddressComponent,
        Autocomplete: MigrationAutocomplete,
        AutocompleteService: MigrationAutocompleteService,
        OpeningHours: OpeningHours,
        OpeningHoursPeriod: OpeningHoursPeriod,
        OpeningHoursPoint: OpeningHoursPoint,
        Place: MigrationPlace,
        PlacesService: MigrationPlacesService,
        PlacesServiceStatus: PlacesServiceStatus,
        PlusCode: PlusCode,
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
                ColorScheme: ColorScheme,
                ControlPosition: MigrationControlPosition,
                LatLng: MigrationLatLng,
                LatLngBounds: MigrationLatLngBounds,
                MVCObject: MigrationMVCObject,
                event: {
                  addListener: addListener,
                  addListenerOnce: addListenerOnce,
                  removeListener: removeListener,
                },
              });
              break;

            case "geocoding":
              resolve({
                Geocoder: MigrationGeocoder,
                GeocoderStatus: GeocoderStatus,
              });
              break;

            case "maps":
              resolve({
                Circle: MigrationCircle,
                InfoWindow: MigrationInfoWindow,
                Map: MigrationMap,
                MapTypeId: MapTypeId,
              });
              break;

            case "places":
              resolve({
                AddressComponent: AddressComponent,
                Autocomplete: MigrationAutocomplete,
                AutocompleteService: MigrationAutocompleteService,
                Place: MigrationPlace,
                PlacesService: MigrationPlacesService,
                PlacesServiceStatus: PlacesServiceStatus,
                OpeningHours: OpeningHours,
                OpeningHoursPeriod: OpeningHoursPeriod,
                OpeningHoursPoint: OpeningHoursPoint,
                PlusCode: PlusCode,
                SearchBox: MigrationSearchBox,
              });
              break;

            case "routes":
              resolve({
                DirectionsRenderer: MigrationDirectionsRenderer,
                DirectionsService: MigrationDirectionsService,
                DistanceMatrixService: MigrationDistanceMatrixService,
                DirectionsStatus: DirectionsStatus,
                TravelMode: TravelMode,
                DistanceMatrixElementStatus: DistanceMatrixElementStatus,
                DistanceMatrixStatus: DistanceMatrixStatus,
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

  // Invoke the optional postMigrationCallback, which is a string passed in that corresponds to the
  // name of a function stored at the global window scope
  if (postMigrationCallback) {
    window[postMigrationCallback]();
  }
};

// If our script was imported in browser, then parse URL params from the query string this script was imported
// with so we can retrieve params (e.g. API key)
const currentScript = document.currentScript as HTMLScriptElement;
if (currentScript) {
  const currentScriptSrc = currentScript.src;
  const queryString = currentScriptSrc.substring(currentScriptSrc.indexOf("?"));
  const urlParams = new URLSearchParams(queryString);

  // API key is required to be passed in, so if it's not we need to log an error and bail out
  const apiKey = urlParams.get("apiKey");

  // Optional, the region to be used
  const region = urlParams.get("region");

  // Optional, will invoke after migrationInit has finished executing
  const postMigrationCallback = urlParams.get("callback");

  migrationInit(apiKey, region, postMigrationCallback);
}

export interface LoaderOptions {
  apiKey: string;
  region?: string;
}

// Mimic the @googlemaps/js-api-loader interface so that users can also import google
// through a typical module import
export class Loader {
  #apiKey: string;
  #region: string;

  constructor({ apiKey, region }: LoaderOptions) {
    this.#apiKey = apiKey;
    this.#region = region;
  }

  // One of two ways the @googlemaps/js-api-loader loads the Google APIs, which follows their importLibrary
  // pattern where you return a Promise to dynamically import a specific library, so we just need to
  // initialize our migration SDK and then return the existing importLibrary Promise
  async importLibrary(name: string) {
    await migrationInit(this.#apiKey, this.#region);
    return window.google.maps.importLibrary(name);
  }

  // The other way is to just load everything into the top level google namespace
  load() {
    return new Promise((resolve) => {
      migrationInit(this.#apiKey, this.#region).then(() => {
        resolve(window.google);
      });
    });
  }
}
