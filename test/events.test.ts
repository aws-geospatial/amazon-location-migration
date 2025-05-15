// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock("@aws-sdk/client-geo-places", () => ({
  ...jest.requireActual("@aws-sdk/client-geo-places"),
  GeoPlacesClient: jest.fn().mockImplementation(() => {
    return {
      // Mock the serviceId because the geocoder plugin looks for this to determine GeoPlacesClient vs. LocationClient
      config: {
        serviceId: "Geo Places",
      },
    };
  }),
}));
import { GeoPlacesClient } from "@aws-sdk/client-geo-places";

import { MigrationInfoWindow, MigrationMap, MigrationMarker } from "../src/maps";
import { MigrationDirectionsRenderer } from "../src/directions";
import { MigrationLatLng } from "../src/common";
import { MigrationSearchBox, MigrationAutocomplete } from "../src/places";
import { addListener, addListenerOnce, removeListener } from "../src/events";

MigrationAutocomplete.prototype._client = new GeoPlacesClient();
MigrationSearchBox.prototype._client = new GeoPlacesClient();

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");

const testPlaceLabel = "Austin, TX, USA";
const testLat = 30.268193;
const testLng = -97.7457518;
const testPlaceWithAddressLabel = "1337 Cool Place Road, Austin, TX, USA";

afterEach(() => {
  jest.clearAllMocks();
});

test("should call handler after close when addListener", () => {
  // mock infowindow so that we can mock on so that we can mock close
  const mockInfoWindow = {
    on: jest.fn(),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListener(migrationInfoWindow, "close", handlerSpy);

  // mock close
  mockInfoWindow.on.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after closeclick when addListener", () => {
  // mock button so that we can mock addEventListener so that we can mock click
  const mockButton = {
    addEventListener: jest.fn(),
  };

  // mock container so that we can mock the button
  const mockContainer = {
    querySelector: jest.fn().mockReturnValue(mockButton),
  };

  // mock marker to return mockElement when getElement is called
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockContainer),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListener(migrationInfoWindow, "closeclick", handlerSpy);

  // mock click button
  mockButton.addEventListener.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after close when addListenerOnce", () => {
  // mock infowindow so that we can mock on so that we can mock close
  const mockInfoWindow = {
    once: jest.fn(),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationInfoWindow, "close", handlerSpy);

  // mock close
  mockInfoWindow.once.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after closeclick when addListenerOnce", () => {
  const mockButton = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock container so that we can mock the button
  const mockContainer = {
    querySelector: jest.fn().mockReturnValue(mockButton),
  };

  // mock marker to return mockElement when getElement is called
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockContainer),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationInfoWindow, "closeclick", handlerSpy);

  // mock click button
  mockButton.addEventListener.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after click when addListenerOnce", () => {
  // mock map so that we can mock click
  const mockMap = {
    once: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMap, "click", handlerSpy);

  // mock click
  const mockMapLibreMapMouseEvent = {
    originalEvent: "click",
    lngLat: { lat: 1, lng: 2 },
  };
  mockMap.once.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "click",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call handler after tilesloaded when addListenerOnce", () => {
  // mock map so that we can mock tilesloaded
  const mockMap = {
    once: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMap, "tilesloaded", handlerSpy);

  // Simulate mocked tilesloaded call
  mockMap.once.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after tilesloaded when addListener", () => {
  // mock map so that we can mock tilesloaded
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListener(migrationMap, "tilesloaded", handlerSpy);

  // Simulate mocked tilesloaded call
  mockMap.on.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after center_changed when addListenerOnce", () => {
  // mock map so that we can mock center_changed
  const mockMap = {
    once: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMap, "center_changed", handlerSpy);

  // Simulate mocked center_changed call
  mockMap.once.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after center_changed when addListener", () => {
  // mock map so that we can mock center_changed
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListener(migrationMap, "center_changed", handlerSpy);

  // Simulate mocked center_changed call
  mockMap.on.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call handler after drag when addListener", () => {
  // mock marker so that we can mock on so that we can mock drag
  const mockMarker = {
    on: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListener(migrationMarker, "drag", handlerSpy);

  // mock drag
  const mockMapLibreMouseEvent = {
    target: {},
    type: "drag",
  };
  mockMarker.on.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "drag",
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler after drag when addListenerOnce", () => {
  // mock marker so that we can mock on so that we can mock drag
  const mockMarker = {
    once: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMarker, "drag", handlerSpy);

  // mock drag
  const mockMapLibreMouseEvent = {
    target: {},
    type: "drag",
  };
  mockMarker.once.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "drag",
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler after click when addListenerOnce", () => {
  // mock element so that we can mock addEventListener so that we can mock click
  const mockElement = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMarker, "click", handlerSpy);

  // mock click
  const mockMapLibreMouseEvent = {
    target: {},
    type: "click",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "click",
      stopPropagation: expect.any(Function),
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler after dblclick when addListenerOnce", () => {
  // mock element so that we can mock addEventListener so that we can mock click
  const mockElement = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const handlerSpy = jest.fn();
  addListenerOnce(migrationMarker, "dblclick", handlerSpy);

  // mock click
  const mockMapLibreMouseEvent = {
    target: {},
    type: "dblclick",
    stopPropagation: jest.fn().mockReturnValue(null),
  };
  mockElement.addEventListener.mock.calls[0][1](mockMapLibreMouseEvent);

  // expected translated MouseEvent (Google's version)
  const expectedGoogleMouseEvent = {
    domEvent: {
      target: {},
      type: "dblclick",
      stopPropagation: expect.any(Function),
    },
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMouseEvent);
});

test("should call handler after directions_changed when addListenerOnce", () => {
  const testMap = new MigrationMap(null, {});
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    suppressMarkers: true,
  });
  const handlerSpy = jest.fn();
  addListenerOnce(testDirectionsRenderer, "directions_changed", handlerSpy);
  const directions = {
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 0, lng: 0 },
            end_location: { lat: 1, lng: 1 },
          },
        ],
      },
    ],
  };

  testDirectionsRenderer.setDirections(directions);
  expect(handlerSpy).toHaveBeenCalledTimes(1);
});

test("should call results handler after place_changed when addListenerOnce", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const autoComplete = new MigrationAutocomplete(inputElement);

  addListenerOnce(autoComplete, "place_changed", () => {
    done();
  });

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder._eventEmitter.emit("results", {
    place: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Address: {
          Label: testPlaceWithAddressLabel,
          Country: {
            Code2: "US",
            Code3: "USA",
            Name: "United States",
          },
          Region: {
            Code: "TX",
            Name: "Texas",
          },
          SubRegion: {
            Name: "Cool SubRegion",
          },
          Locality: "Austin",
          District: "Cool District",
          PostalCode: "78704",
          Street: "Cool Place Road",
          AddressNumber: "1337",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
        PlaceType: "PointOfInterest",
        Position: [testLng, testLat],
        Title: "1337 Cool Place Road",
      },
    },
  });

  expect(autoComplete._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("result")).toStrictEqual([]);
  expect(autoComplete._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("results")).toStrictEqual([]);
});

test("should call result handler after place_changed when addListenerOnce", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const autoComplete = new MigrationAutocomplete(inputElement);

  addListenerOnce(autoComplete, "place_changed", () => {
    done();
  });

  const geocoder = autoComplete._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder._eventEmitter.emit("result", {
    result: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Address: {
          Label: testPlaceWithAddressLabel,
          Country: {
            Code2: "US",
            Code3: "USA",
            Name: "United States",
          },
          Region: {
            Code: "TX",
            Name: "Texas",
          },
          SubRegion: {
            Name: "Cool SubRegion",
          },
          Locality: "Austin",
          District: "Cool District",
          PostalCode: "78704",
          Street: "Cool Place Road",
          AddressNumber: "1337",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
        PlaceType: "PointOfInterest",
        Position: [testLng, testLat],
        Title: "1337 Cool Place Road",
      },
    },
  });

  expect(autoComplete._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("result")).toStrictEqual([]);
  expect(autoComplete._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("results")).toStrictEqual([]);
});

test("should call result handler after places_changed when addListenerOnce", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {});

  addListenerOnce(searchBox, "places_changed", () => {
    done();
  });

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder._eventEmitter.emit("result", {
    result: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Address: {
          Label: testPlaceWithAddressLabel,
          Country: {
            Code2: "US",
            Code3: "USA",
            Name: "United States",
          },
          Region: {
            Code: "TX",
            Name: "Texas",
          },
          SubRegion: {
            Name: "Cool SubRegion",
          },
          Locality: "Austin",
          District: "Cool District",
          PostalCode: "78704",
          Street: "Cool Place Road",
          AddressNumber: "1337",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
        PlaceType: "PointOfInterest",
        Position: [testLng, testLat],
        Title: "1337 Cool Place Road",
      },
    },
  });

  expect(searchBox._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("result")).toStrictEqual([]);
  expect(searchBox._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("results")).toStrictEqual([]);
});

test("should call results handler after places_changed when addListenerOnce", (done) => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);
  const searchBox = new MigrationSearchBox(inputElement, {});

  addListenerOnce(searchBox, "places_changed", () => {
    done();
  });

  const geocoder = searchBox._getMaplibreGeocoder().getPlacesGeocoder();
  geocoder._eventEmitter.emit("results", {
    place: {
      type: "Feature",
      place_name: testPlaceLabel,
      properties: {
        Address: {
          Label: testPlaceWithAddressLabel,
          Country: {
            Code2: "US",
            Code3: "USA",
            Name: "United States",
          },
          Region: {
            Code: "TX",
            Name: "Texas",
          },
          SubRegion: {
            Name: "Cool SubRegion",
          },
          Locality: "Austin",
          District: "Cool District",
          PostalCode: "78704",
          Street: "Cool Place Road",
          AddressNumber: "1337",
        },
        PlaceId: "KEEP_AUSTIN_WEIRD",
        PlaceType: "PointOfInterest",
        Position: [testLng, testLat],
        Title: "1337 Cool Place Road",
      },
    },
  });

  expect(searchBox._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("result")).toStrictEqual([]);
  expect(searchBox._getMaplibreGeocoder().getPlacesGeocoder()._eventEmitter.listeners("results")).toStrictEqual([]);
});

test("should remove infowindow close listener", () => {
  // mock infowindow so that we can mock on so that we can mock close
  const mockInfoWindow = {
    on: jest.fn(),
    off: jest.fn(),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const listener = addListener(migrationInfoWindow, "close", {});
  removeListener(listener);

  expect(mockInfoWindow.off).toHaveBeenCalledTimes(1);
});

test("should remove infowindow closeclick listener", () => {
  // mock button so that we can mock addEventListener so that we can mock click
  const mockButton = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock container so that we can mock the button
  const mockContainer = {
    querySelector: jest.fn().mockReturnValue(mockButton),
  };

  // mock marker to return mockElement when getElement is called
  const mockInfoWindow = {
    getElement: jest.fn().mockReturnValue(mockContainer),
  };
  const migrationInfoWindow = new MigrationInfoWindow({});
  migrationInfoWindow._setPopup(mockInfoWindow);

  // add spy as handler
  const listener = addListener(migrationInfoWindow, "closeclick", {});
  removeListener(listener);

  expect(mockButton.removeEventListener).toHaveBeenCalledTimes(1);
});

test("should remove marker drag listener", () => {
  // mock marker so that we can mock on so that we can mock drag
  const mockMarker = {
    once: jest.fn(),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
    off: jest.fn(),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  const listener = addListenerOnce(migrationMarker, "drag", {});
  removeListener(listener);

  expect(mockMarker.off).toHaveBeenCalledTimes(1);
});

test("should remove marker click listener", () => {
  // mock element so that we can mock addEventListener so that we can mock click
  const mockElement = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // mock marker to return mockElement when getElement is called
  const mockMarker = {
    getElement: jest.fn().mockReturnValue(mockElement),
    getLngLat: jest.fn().mockReturnValue(new MigrationLatLng(1, 2)),
  };
  const migrationMarker = new MigrationMarker({});
  migrationMarker._setMarker(mockMarker);

  // add spy as handler
  const listener = addListenerOnce(migrationMarker, "click", {});
  removeListener(listener);

  expect(mockElement.removeEventListener).toHaveBeenCalledTimes(1);
});

test("should remove map click listener", () => {
  // mock map so that we can mock click
  const mockMap = {
    once: jest.fn(),
    off: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  const listener = addListenerOnce(migrationMap, "click", {});
  removeListener(listener);

  expect(mockMap.off).toHaveBeenCalledTimes(1);
});

test("should remove map tilesloaded listener", () => {
  // mock map so that we can mock tilesloaded
  const mockMap = {
    once: jest.fn(),
    off: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  const listener = addListenerOnce(migrationMap, "tilesloaded", {});
  removeListener(listener);

  expect(mockMap.off).toHaveBeenCalledTimes(1);
});

test("should remove map center_changed listener", () => {
  // mock map so that we can mock center_changed
  const mockMap = {
    once: jest.fn(),
    off: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  const listener = addListenerOnce(migrationMap, "center_changed", {});
  removeListener(listener);

  expect(mockMap.off).toHaveBeenCalledTimes(1);
});

test("should remove directionsrenderer directions_changed listeners", () => {
  const testDirectionsRenderer = new MigrationDirectionsRenderer({});

  const onceListener = addListenerOnce(testDirectionsRenderer, "directions_changed", {});
  removeListener(onceListener);
  const onSistener = addListener(testDirectionsRenderer, "directions_changed", {});
  removeListener(onSistener);

  expect(testDirectionsRenderer._getOnDirectionsChangedListeners()).toStrictEqual([]);
  expect(testDirectionsRenderer._getOnceDirectionsChangedListeners()).toStrictEqual([]);
});

test("should remove SearchBox places_changed listeners", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const searchBox = new MigrationSearchBox(inputElement);
  const mockedGeocoder = {
    getPlacesGeocoder: jest.fn().mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
    }),
  };
  searchBox._setMapLibreGeocoder(mockedGeocoder);

  const listener = addListenerOnce(searchBox, "places_changed", {});
  removeListener(listener);

  expect(mockedGeocoder.getPlacesGeocoder().on).toHaveBeenCalledTimes(2);
  expect(mockedGeocoder.getPlacesGeocoder().off).toHaveBeenCalledTimes(2);
});

test("should remove Autocomplete place_changed listeners", () => {
  const inputElement = document.createElement("input");
  document.body.appendChild(inputElement);

  const autoComplete = new MigrationAutocomplete(inputElement);
  const mockedGeocoder = {
    getPlacesGeocoder: jest.fn().mockReturnValue({
      on: jest.fn(),
      off: jest.fn(),
    }),
  };
  autoComplete._setMapLibreGeocoder(mockedGeocoder);

  const listener = addListenerOnce(autoComplete, "place_changed", {});
  removeListener(listener);

  expect(mockedGeocoder.getPlacesGeocoder().on).toHaveBeenCalledTimes(2);
  expect(mockedGeocoder.getPlacesGeocoder().off).toHaveBeenCalledTimes(2);
});
