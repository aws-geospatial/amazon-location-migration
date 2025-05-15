// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import { LocationClient } from "@aws-sdk/client-location";
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

// Optional, but if user wants to perform any Route requests, this is required
const routeCalculatorName = urlParams.get("routeCalculator");

// Optional, will invoke after migrationInit has finished executing
const postMigrationCallback = urlParams.get("callback");

const migrationInit = async function () {
  // Pass our region and API key to our Migration Map class so that it can build the style URL
  MigrationMap.prototype._apiKey = apiKey;
  MigrationMap.prototype._region = region;

  // Create an authentication helper instance using an API key
  const authHelper = await withAPIKey(apiKey);

  // TODO: We still create a V1 client for now while we are in the process of converting all APIs to V2
  const apiKeyV1 = apiKey;
  const authHelperV1 = await withAPIKey(apiKeyV1);
  const clientV1 = new LocationClient({
    region: "us-west-2", // Region containing Amazon Location resource
    customUserAgent: `migration-sdk-${PACKAGE_VERSION}`, // Append tag with SDK version to the default user agent
    ...authHelperV1.getClientConfig(), // Configures the client to use API keys when making supported requests
  });

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

  // Pass our location client, and optionally place index and route calculator names
  // to our migration services
  MigrationAutocomplete.prototype._client = placesClient;
  MigrationAutocompleteService.prototype._client = placesClient;
  MigrationGeocoder.prototype._client = placesClient;
  MigrationPlace._client = placesClient;
  MigrationPlacesService.prototype._client = placesClient;
  MigrationSearchBox.prototype._client = placesClient;
  MigrationDirectionsService.prototype._client = routesClient;
  MigrationDistanceMatrixService.prototype._client = clientV1;
  MigrationDistanceMatrixService.prototype._routeCalculatorName = routeCalculatorName;

  // Additionally, we need to create a places service for our directions service and distance matrix
  // service to use, since it can optionally be passed source/destinations that are string queries
  // instead of actual LatLng coordinates.
  // We also need to create a places service for the Geocoder, which will use it for the
  // address and placeId geocode requests.
  // Constructing it here and passing it in will make sure
  // it is already configured with the appropriate client and place index name.
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

  if (postMigrationCallback) {
    window[postMigrationCallback]();
  }
};

migrationInit();
