// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Setup fake HTMLScriptElement so that our unit test can simulate the migration SDK
// retrieving its configuration from the URLSearchParams
const testAPIKey = "123456789";
const testMapName = "TestMap";
const testPlaceIndex = "TestPlaceIndex";
const testRouteCalculator = "TestRouteCalculator";
const testCallback = "testCallback";
const testCurrentScript = document.createElement("src") as HTMLScriptElement;
testCurrentScript.src = `amazonLocationMigrationSDK.js?callback=${testCallback}&map=${testMapName}&placeIndex=${testPlaceIndex}&routeCalculator=${testRouteCalculator}&apiKey=${testAPIKey}`;

// Override the document.currentScript with our fake HTMLScriptElement
Object.defineProperty(document, "currentScript", {
  value: testCurrentScript,
});

// Create a mock callback function so we can verify the migration SDK calls it after loading
const mockMigrationCallback = jest.fn();
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
(window as any)[testCallback] = mockMigrationCallback;

// Import the migration SDK after our mock script HTMLScriptElement has been setup
import "../src/index";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("importing the SDK should populate google.maps namespace for direct loading", () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  // Core classes
  expect(google.maps).toHaveProperty("Circle");
  expect(google.maps).toHaveProperty("ColorScheme");
  expect(google.maps).toHaveProperty("ControlPosition");
  expect(google.maps).toHaveProperty("LatLng");
  expect(google.maps).toHaveProperty("LatLngBounds");
  expect(google.maps).toHaveProperty("MVCObject");
  expect(google.maps).toHaveProperty("event");

  // Maps and controls (e.g. Markers)
  expect(google.maps).toHaveProperty("Map");
  expect(google.maps).toHaveProperty("MapTypeId");
  expect(google.maps).toHaveProperty("Marker");
  expect(google.maps.marker).toHaveProperty("AdvancedMarkerElement");

  // Directions classes
  expect(google.maps).toHaveProperty("DirectionsRenderer");
  expect(google.maps).toHaveProperty("DirectionsService");
  expect(google.maps).toHaveProperty("DirectionsStatus");
  expect(google.maps).toHaveProperty("TravelMode");
  expect(google.maps).toHaveProperty("DistanceMatrixService");
  expect(google.maps).toHaveProperty("DistanceMatrixElementStatus");
  expect(google.maps).toHaveProperty("DistanceMatrixStatus");

  // Places classes
  expect(google.maps.places).toHaveProperty("Autocomplete");
  expect(google.maps.places).toHaveProperty("AutocompleteService");
  expect(google.maps.places).toHaveProperty("Place");
  expect(google.maps.places).toHaveProperty("PlacesService");
  expect(google.maps.places).toHaveProperty("PlacesServiceStatus");
  expect(google.maps.places).toHaveProperty("SearchBox");

  // Geocoder classes
  expect(google.maps).toHaveProperty("Geocoder");
  expect(google.maps).toHaveProperty("GeocoderStatus");

  // Verify our mock callback has been invoked after loading the SDK
  expect(mockMigrationCallback).toHaveBeenCalledTimes(1);
});

test("can dynamically import core classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { ColorScheme, ControlPosition, LatLng, LatLngBounds, MVCObject, event } = await google.maps.importLibrary(
    "core",
  );

  expect(ColorScheme).toBeDefined();
  expect(ControlPosition).toBeDefined();
  expect(LatLng).toBeDefined();
  expect(LatLngBounds).toBeDefined();
  expect(MVCObject).toBeDefined();
  expect(event.addListener).toBeDefined();
  expect(event.addListenerOnce).toBeDefined();
  expect(event.removeListener).toBeDefined();
});

test("can dynamically import maps classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { Circle, InfoWindow, Map, MapTypeId } = await google.maps.importLibrary("maps");

  expect(Circle).toBeDefined();
  expect(InfoWindow).toBeDefined();
  expect(Map).toBeDefined();
  expect(MapTypeId).toBeDefined();
});

test("can dynamically import places classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { Autocomplete, AutocompleteService, Place, PlacesService, PlacesServiceStatus, SearchBox } =
    await google.maps.importLibrary("places");

  expect(Autocomplete).toBeDefined();
  expect(AutocompleteService).toBeDefined();
  expect(Place).toBeDefined();
  expect(PlacesService).toBeDefined();
  expect(PlacesServiceStatus).toBeDefined();
  expect(SearchBox).toBeDefined();
});

test("can dynamically import routes classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const {
    DirectionsRenderer,
    DirectionsService,
    DistanceMatrixService,
    DirectionsStatus,
    TravelMode,
    DistanceMatrixElementStatus,
    DistanceMatrixStatus,
  } = await google.maps.importLibrary("routes");

  expect(DirectionsRenderer).toBeDefined();
  expect(DirectionsService).toBeDefined();
  expect(DistanceMatrixService);
  expect(DirectionsStatus).toBeDefined();
  expect(TravelMode).toBeDefined();
  expect(DistanceMatrixElementStatus).toBeDefined();
  expect(DistanceMatrixStatus).toBeDefined();
});

test("can dynamically import marker classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { AdvancedMarkerElement, Marker } = await google.maps.importLibrary("marker");

  expect(AdvancedMarkerElement).toBeDefined();
  expect(Marker).toBeDefined();
});

test("can dynamically import geocoder classes", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { Geocoder, GeocoderStatus } = await google.maps.importLibrary("geocoding");

  expect(Geocoder).toBeDefined();
  expect(GeocoderStatus).toBeDefined();
});

test("should report an error if a library we don't support is requested", async () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  const { ThisClassWontExist } = await google.maps.importLibrary("INVALID_LIBRARY");

  expect(ThisClassWontExist).toBeUndefined();
  expect(console.error).toHaveBeenCalledTimes(1);
});
