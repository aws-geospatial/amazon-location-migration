// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Setup fake HTMLScriptElement so that our unit test can simulate the migration adapter
// retrieving its configuration from the URLSearchParams
const testAPIKey = "123456789";
const testMapName = "TestMap";
const testPlaceIndex = "TestPlaceIndex";
const testRouteCalculator = "TestRouteCalculator";
const testCallback = "testCallback";
const testCurrentScript = document.createElement("src") as HTMLScriptElement;
testCurrentScript.src = `amazonLocationMigrationAdapter.js?callback=${testCallback}&map=${testMapName}&placeIndex=${testPlaceIndex}&routeCalculator=${testRouteCalculator}&apiKey=${testAPIKey}`;

// Override the document.currentScript with our fake HTMLScriptElement
Object.defineProperty(document, "currentScript", {
  value: testCurrentScript,
});

// Create a mock callback function so we can verify the migration adapter calls it after loading
const mockMigrationCallback = jest.fn();
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
(window as any)[testCallback] = mockMigrationCallback;

// Import the migration adapter after our mock script HTMLScriptElement has been setup
import "../src/index";

afterEach(() => {
  jest.clearAllMocks();
});

test("importing the adapter should populate google.maps namespace for direct loading", () => {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const google = (window as any).google;

  // Core classes
  expect(google.maps).toHaveProperty("LatLng");
  expect(google.maps).toHaveProperty("LatLngBounds");

  // Maps and controls (e.g. Markers)
  expect(google.maps).toHaveProperty("Map");
  expect(google.maps).toHaveProperty("Marker");
  expect(google.maps.marker).toHaveProperty("AdvancedMarkerElement");

  // Directions classes
  expect(google.maps).toHaveProperty("DirectionsRenderer");
  expect(google.maps).toHaveProperty("DirectionsService");
  expect(google.maps).toHaveProperty("DirectionsStatus");
  expect(google.maps).toHaveProperty("TravelMode");

  // Places classes
  expect(google.maps.places).toHaveProperty("AutocompleteService");
  expect(google.maps.places).toHaveProperty("PlacesService");
  expect(google.maps.places).toHaveProperty("PlacesServiceStatus");

  // Verify our mock callback has been invoked after loading the adapter
  expect(mockMigrationCallback).toHaveBeenCalledTimes(1);
});
