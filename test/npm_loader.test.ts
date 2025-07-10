// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Import the migration SDK index. Unlike the index.test.ts, we don't setup a mock currentScript, so this
// test file can test being imported through the NPM Loader pattern
import { Loader } from "../src/index";

// Spy on console.error so we can verify it gets called in error cases
jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("importing the SDK through the NPM Loader should populate google.maps namespace", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  // Dynamically load the migration SDK
  await loader.load();

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
  expect(google.maps.places).toHaveProperty("AddressComponent");
  expect(google.maps.places).toHaveProperty("Autocomplete");
  expect(google.maps.places).toHaveProperty("AutocompleteService");
  expect(google.maps.places).toHaveProperty("OpeningHours");
  expect(google.maps.places).toHaveProperty("OpeningHoursPeriod");
  expect(google.maps.places).toHaveProperty("OpeningHoursPoint");
  expect(google.maps.places).toHaveProperty("Place");
  expect(google.maps.places).toHaveProperty("PlacesService");
  expect(google.maps.places).toHaveProperty("PlacesServiceStatus");
  expect(google.maps.places).toHaveProperty("PlusCode");
  expect(google.maps.places).toHaveProperty("SearchBox");

  // Geocoder classes
  expect(google.maps).toHaveProperty("Geocoder");
  expect(google.maps).toHaveProperty("GeocoderStatus");
});

test("can dynamically import core classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const { ColorScheme, ControlPosition, LatLng, LatLngBounds, MVCObject, event } = (await loader.importLibrary(
    "core",
  )) as google.maps.CoreLibrary;

  expect(ColorScheme).toBeDefined();
  expect(ControlPosition).toBeDefined();
  expect(LatLng).toBeDefined();
  expect(LatLngBounds).toBeDefined();
  expect(MVCObject).toBeDefined();
  expect(event.addListener).toBeDefined();
  expect(event.addListenerOnce).toBeDefined();
  expect(event.removeListener).toBeDefined();
});

test("can dynamically import maps classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const { Circle, InfoWindow, Map, MapTypeId } = (await loader.importLibrary("maps")) as google.maps.MapsLibrary;

  expect(Circle).toBeDefined();
  expect(InfoWindow).toBeDefined();
  expect(Map).toBeDefined();
  expect(MapTypeId).toBeDefined();
});

test("can dynamically import places classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const {
    AddressComponent,
    Autocomplete,
    AutocompleteService,
    OpeningHours,
    OpeningHoursPeriod,
    OpeningHoursPoint,
    Place,
    PlacesService,
    PlacesServiceStatus,
    PlusCode,
    SearchBox,
  } = (await loader.importLibrary("places")) as google.maps.PlacesLibrary;

  expect(AddressComponent).toBeDefined();
  expect(Autocomplete).toBeDefined();
  expect(AutocompleteService).toBeDefined();
  expect(OpeningHours).toBeDefined();
  expect(OpeningHoursPeriod).toBeDefined();
  expect(OpeningHoursPoint).toBeDefined();
  expect(Place).toBeDefined();
  expect(PlacesService).toBeDefined();
  expect(PlacesServiceStatus).toBeDefined();
  expect(PlusCode).toBeDefined();
  expect(SearchBox).toBeDefined();
});

test("can dynamically import routes classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const {
    DirectionsRenderer,
    DirectionsService,
    DistanceMatrixService,
    DirectionsStatus,
    TravelMode,
    DistanceMatrixElementStatus,
    DistanceMatrixStatus,
  } = (await loader.importLibrary("routes")) as google.maps.RoutesLibrary;

  expect(DirectionsRenderer).toBeDefined();
  expect(DirectionsService).toBeDefined();
  expect(DistanceMatrixService);
  expect(DirectionsStatus).toBeDefined();
  expect(TravelMode).toBeDefined();
  expect(DistanceMatrixElementStatus).toBeDefined();
  expect(DistanceMatrixStatus).toBeDefined();
});

test("can dynamically import marker classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const { AdvancedMarkerElement, Marker } = (await loader.importLibrary("marker")) as google.maps.MarkerLibrary;

  expect(AdvancedMarkerElement).toBeDefined();
  expect(Marker).toBeDefined();
});

test("can dynamically import geocoder classes through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const { Geocoder, GeocoderStatus } = (await loader.importLibrary("geocoding")) as google.maps.GeocodingLibrary;

  expect(Geocoder).toBeDefined();
  expect(GeocoderStatus).toBeDefined();
});

test("should report an error if a library we don't support is requested through the NPM Loader", async () => {
  const loader = new Loader({
    apiKey: "testAPIKey",
    region: "us-west-2",
  });

  const { HeatmapLayer } = (await loader.importLibrary("visualization")) as google.maps.VisualizationLibrary;

  expect(HeatmapLayer).toBeUndefined();
  expect(console.error).toHaveBeenCalledTimes(1);
});
