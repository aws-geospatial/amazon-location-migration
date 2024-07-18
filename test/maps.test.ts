// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationControlPosition, MigrationLatLng, MigrationLatLngBounds } from "../src/googleCommon";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
const mockAddControl = jest.fn();
const mockRemoveControl = jest.fn();
const mockFitBounds = jest.fn();
const mockGetBounds = jest.fn();
const mockGetCenter = jest.fn();
const mockSetCenter = jest.fn();
const mockGetContainer = jest.fn();
const mockJumpTo = jest.fn();
const mockOn = jest.fn();
const mockPanBy = jest.fn();
const mockPanTo = jest.fn();
const mockGetBearing = jest.fn();
const mockSetBearing = jest.fn();
const mockGetPitch = jest.fn();
const mockSetPitch = jest.fn();
const mockGetZoom = jest.fn();
const mockSetZoom = jest.fn();
const mockSetMinZoom = jest.fn();
const mockSetMaxZoom = jest.fn();

jest.mock("maplibre-gl", () => ({
  ...jest.requireActual("maplibre-gl"),
  Map: jest.fn().mockImplementation(() => {
    return {
      addControl: mockAddControl,
      removeControl: mockRemoveControl,

      fitBounds: mockFitBounds,
      getBounds: mockGetBounds,

      getCenter: mockGetCenter,
      setCenter: mockSetCenter,

      getContainer: mockGetContainer,

      jumpTo: mockJumpTo,
      on: mockOn,

      panBy: mockPanBy,
      panTo: mockPanTo,

      getBearing: mockGetBearing,
      setBearing: mockSetBearing,
      getPitch: mockGetPitch,
      setPitch: mockSetPitch,
      getZoom: mockGetZoom,
      setZoom: mockSetZoom,
      setMinZoom: mockSetMinZoom,
      setMaxZoom: mockSetMaxZoom,
    };
  }),
}));

import { LngLatBounds, Map, MapOptions, NavigationControl } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should set migration map options", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
    minZoom: 2,
    maxZoom: 18,
    tilt: 45,
    heading: 90,
    zoomControl: true,
    zoomControlOptions: {
      position: MigrationControlPosition.LEFT_TOP,
    },
  });

  const expectedMaplibreOptions: MapOptions = {
    container: null,
    style: undefined,
    center: [testLng, testLat],
    zoom: 9,
    minZoom: 2,
    maxZoom: 18,
    pitch: 45,
    bearing: 90,
    transformRequest: expect.any(Function),
  };
  expect(testMap).not.toBeNull();
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(mockAddControl).toHaveBeenCalledTimes(1);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-left");
});

test("should set migration map options with control position not available in MapLibre", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
    zoomControlOptions: {
      position: MigrationControlPosition.BLOCK_START_INLINE_CENTER,
    },
  });

  const expectedMaplibreOptions: MapOptions = {
    container: null,
    style: undefined,
    center: [testLng, testLat],
    zoom: 9,
    transformRequest: expect.any(Function),
  };
  expect(testMap).not.toBeNull();
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(mockAddControl).toHaveBeenCalledTimes(1);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
});

test("should log error with invalid map option center", () => {
  const testMap = new MigrationMap(null, {
    center: "THIS_IS_NOT_A_VALID_CENTER",
  });

  expect(testMap).not.toBeNull();
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith("Unrecognized center option", "THIS_IS_NOT_A_VALID_CENTER");
});

test("should call setZoom from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setZoom(3);

  expect(mockSetZoom).toHaveBeenCalledTimes(1);
  expect(mockSetZoom).toHaveBeenCalledWith(3);
});

test("should call setCenter from migration map with LatLng", () => {
  const testMap = new MigrationMap(null, {});
  const testCenter = new MigrationLatLng(1, 2);

  testMap.setCenter(testCenter);

  expect(mockSetCenter).toHaveBeenCalledTimes(1);
  expect(mockSetCenter).toHaveBeenCalledWith([2, 1]);
});

test("should call setCenter from migration map with LatLngLiteral", () => {
  const testMap = new MigrationMap(null, {});
  const testCenter = { lat: 3, lng: 4 };

  testMap.setCenter(testCenter);

  expect(mockSetCenter).toHaveBeenCalledTimes(1);
  expect(mockSetCenter).toHaveBeenCalledWith([4, 3]);
});

test("should call setHeading from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setHeading(45);

  expect(mockSetBearing).toHaveBeenCalledTimes(1);
  expect(mockSetBearing).toHaveBeenCalledWith(45);
});

test("should call setOptions from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    center: { lat: testLat, lng: testLng },
    zoom: 9,
    minZoom: 2,
    maxZoom: 18,
    tilt: 45,
    heading: 90,
    zoomControl: true,
    zoomControlOptions: {
      position: MigrationControlPosition.LEFT_TOP,
    },
  });

  expect(mockSetCenter).toHaveBeenCalledTimes(1);
  expect(mockSetCenter).toHaveBeenCalledWith([testLng, testLat]);
  expect(mockSetZoom).toHaveBeenCalledTimes(1);
  expect(mockSetZoom).toHaveBeenCalledWith(9);
  expect(mockSetMaxZoom).toHaveBeenCalledTimes(1);
  expect(mockSetMaxZoom).toHaveBeenCalledWith(18);
  expect(mockSetMinZoom).toHaveBeenCalledTimes(1);
  expect(mockSetMinZoom).toHaveBeenCalledWith(2);
  expect(mockSetPitch).toHaveBeenCalledTimes(1);
  expect(mockSetPitch).toHaveBeenCalledWith(45);
  expect(mockSetBearing).toHaveBeenCalledTimes(1);
  expect(mockSetBearing).toHaveBeenCalledWith(90);
  expect(mockAddControl).toHaveBeenCalledTimes(2);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-left");
});

test("should call setOptions from migration map and remove NavigationControl", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    zoomControl: false,
  });

  expect(mockAddControl).toHaveBeenCalledTimes(1);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(mockRemoveControl).toHaveBeenCalledTimes(1);
  expect(mockRemoveControl).toHaveBeenCalledWith(expect.any(NavigationControl));
});

test("should call setOptions from migration map and add new NavigationControl", () => {
  const testMap = new MigrationMap(null, {
    zoomControl: false,
  });

  testMap.setOptions({
    zoomControl: true,
  });

  expect(mockAddControl).toHaveBeenCalledTimes(1);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
});

test("should call setOptions from migration map and add new NavigationControl with zoomControlOptions", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    zoomControlOptions: {
      position: MigrationControlPosition.RIGHT_TOP,
    },
  });

  expect(mockAddControl).toHaveBeenCalledTimes(2);
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(mockAddControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-right");
  expect(mockRemoveControl).toHaveBeenCalledTimes(1);
  expect(mockRemoveControl).toHaveBeenCalledWith(expect.any(NavigationControl));
});

test("should log error when setOptions is called with invalid center", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    center: "ANOTHER_INVALID_CENTER",
  });

  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith("Unrecognized center option", "ANOTHER_INVALID_CENTER");
});

test("should call setTilt from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setTilt(30);

  expect(mockSetPitch).toHaveBeenCalledTimes(1);
  expect(mockSetPitch).toHaveBeenCalledWith(30);
});

test("should call get methods from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.getCenter();
  testMap.getDiv();
  testMap.getHeading();
  testMap.getTilt();
  testMap.getZoom();

  expect(mockGetCenter).toHaveBeenCalledTimes(1);
  expect(mockGetContainer).toHaveBeenCalledTimes(1);
  expect(mockGetBearing).toHaveBeenCalledTimes(1);
  expect(mockGetPitch).toHaveBeenCalledTimes(1);
  expect(mockGetZoom).toHaveBeenCalledTimes(1);
});

test("should call getBounds from migration map", () => {
  // need to mock #map.getBounds() because if we do not, getBounds() will return undefined and when
  // we try to call bounds.getSouthWest() and bounds.getNorthEast() on undefined in the line after,
  // a null pointer exception is thrown and the test fails
  const west = 1;
  const south = 2;
  const east = 3;
  const north = 4;
  const mockMap = {
    getBounds: jest.fn().mockReturnValue(new LngLatBounds([west, south, east, north])),
  };
  const testMap = new MigrationMap(null, {});
  testMap._setMap(mockMap);

  const bounds = testMap.getBounds();

  expect(mockMap.getBounds).toHaveBeenCalledTimes(1);
  expect(bounds.getSouthWest().lat()).toStrictEqual(south);
  expect(bounds.getSouthWest().lng()).toStrictEqual(west);
  expect(bounds.getNorthEast().lat()).toStrictEqual(north);
  expect(bounds.getNorthEast().lng()).toStrictEqual(east);
});

test("should call moveCamera from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.moveCamera({
    center: new MigrationLatLng(testLat, testLng),
    zoom: 16,
    heading: 90,
    tilt: 45,
  });

  expect(mockJumpTo).toHaveBeenCalledTimes(1);
  expect(mockJumpTo).toHaveBeenCalledWith({
    center: [testLng, testLat],
    zoom: 16,
    bearing: 90,
    pitch: 45,
  });
});

test("should log error when moveCamera is called with invalid center", () => {
  const testMap = new MigrationMap(null, {});

  testMap.moveCamera({
    center: "NOT_A_REAL_CENTER",
    zoom: 16,
    heading: 90,
    tilt: 45,
  });

  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith("Unrecognized center option", "NOT_A_REAL_CENTER");
});

test("should call panBy from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.panBy(50, 60);

  expect(mockPanBy).toHaveBeenCalledTimes(1);
  expect(mockPanBy).toHaveBeenCalledWith([50, 60]);
});

test("should call panTo from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.panTo({ lat: testLat, lng: testLng });

  expect(mockPanTo).toHaveBeenCalledTimes(1);
  expect(mockPanTo).toHaveBeenCalledWith([testLng, testLat]);
});

test("should call fitBounds from migration map", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = new MigrationLatLng(1, 2);
  const testNorthEast = new MigrationLatLng(3, 4);
  const testBounds = new MigrationLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds);

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  expect(mockFitBounds).toHaveBeenCalledWith(testBounds._getBounds());
});

test("should call fitBounds from migration map with valid padding", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = new MigrationLatLng(1, 2);
  const testNorthEast = new MigrationLatLng(3, 4);
  const testBounds = new MigrationLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds, 100);

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  expect(mockFitBounds).toHaveBeenCalledWith(testBounds._getBounds(), {
    padding: 100,
  });
});

test("should call fitBounds from migration map with valid padding specifying all four sides", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = new MigrationLatLng(1, 2);
  const testNorthEast = new MigrationLatLng(3, 4);
  const testBounds = new MigrationLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds, { left: 10, right: 20, top: 30, bottom: 40 });

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  expect(mockFitBounds).toHaveBeenCalledWith(testBounds._getBounds(), {
    padding: { left: 10, right: 20, top: 30, bottom: 40 },
  });
});

test("should call fitBounds from migration map with valid padding specifying no sides", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = new MigrationLatLng(1, 2);
  const testNorthEast = new MigrationLatLng(3, 4);
  const testBounds = new MigrationLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds, {});

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  expect(mockFitBounds).toHaveBeenCalledWith(testBounds._getBounds(), {
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
  });
});

test("should call fitBounds from migration map with invalid padding", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = new MigrationLatLng(1, 2);
  const testNorthEast = new MigrationLatLng(3, 4);
  const testBounds = new MigrationLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds, "bad bounds");

  expect(mockFitBounds).toHaveBeenCalledTimes(1);
  // still calls fitBounds, but with no padding
  expect(mockFitBounds).toHaveBeenCalledWith(testBounds._getBounds());
});

test("should call addListener from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.addListener("click", () => {});
  testMap.addListener("dblclick", () => {});
  testMap.addListener("contextmenu", () => {});
  testMap.addListener("mousemove", () => {});
  testMap.addListener("mouseout", () => {});
  testMap.addListener("mouseover", () => {});
  testMap.addListener("tilesloaded", () => {});
  testMap.addListener("tilt_changed", () => {});
  testMap.addListener("zoom_changed", () => {});
  testMap.addListener("drag", () => {});
  testMap.addListener("dragend", () => {});
  testMap.addListener("dragstart", () => {});

  expect(mockOn).toHaveBeenCalledTimes(12);
  expect(mockOn).toHaveBeenCalledWith("click", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("dblclick", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("contextmenu", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("mousemove", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("mouseout", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("mouseover", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("load", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("pitch", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("zoom", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("drag", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("dragend", expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith("dragstart", expect.any(Function));
});

test("should call handler with translated MapMouseEvent after click", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("click", handlerSpy);

  // mock click
  const mockMapLibreMapMouseEvent = {
    originalEvent: "click",
    lngLat: { lat: 1, lng: 2 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

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

test("should call handler with translated MapMouseEvent after dblclick", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("dblclick", handlerSpy);

  // mock double click
  const mockMapLibreMapMouseEvent = {
    originalEvent: "dblclick",
    lngLat: { lat: 3, lng: 4 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "dblclick",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call handler with translated MapMouseEvent after contextmenu", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("contextmenu", handlerSpy);

  // mock context menu
  const mockMapLibreMapMouseEvent = {
    originalEvent: "contextmenu",
    lngLat: { lat: 3, lng: 4 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "contextmenu",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call handler with translated MapMouseEvent after mousemove", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("mousemove", handlerSpy);

  // mock move mouse
  const mockMapLibreMapMouseEvent = {
    originalEvent: "mousemove",
    lngLat: { lat: 3, lng: 4 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "mousemove",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call handler with translated MapMouseEvent after mouseout", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("mouseout", handlerSpy);

  // mock mouseout
  const mockMapLibreMapMouseEvent = {
    originalEvent: "mouseout",
    lngLat: { lat: 3, lng: 4 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "mouseout",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call handler with translated MapMouseEvent after mouseover", () => {
  // mock map so that we can mock on so that we can mock click
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("mouseover", handlerSpy);

  // mock mouseover
  const mockMapLibreMapMouseEvent = {
    originalEvent: "mouseover",
    lngLat: { lat: 3, lng: 4 },
  };
  mockMap.on.mock.calls[0][1](mockMapLibreMapMouseEvent);

  // expected translated MapMouseEvent (Google's version)
  const expectedGoogleMapMouseEvent = {
    domEvent: "mouseover",
    latLng: {
      lat: expect.any(Function),
      lng: expect.any(Function),
    },
  };

  expect(handlerSpy).toHaveBeenCalledTimes(1);
  expect(handlerSpy).toHaveBeenCalledWith(expectedGoogleMapMouseEvent);
});

test("should call GoogleMapEvent handler after tilesloaded", () => {
  // mock map so that we can mock on so that we can mock tilesloaded
  const mockMap = {
    on: jest.fn(),
  };
  const migrationMap = new MigrationMap(null, {});
  migrationMap._setMap(mockMap);

  // add spy as handler
  const handlerSpy = jest.fn();
  migrationMap.addListener("tilesloaded", handlerSpy);

  // Simulate mocked tilesloaded call
  mockMap.on.mock.calls[0][1]();

  expect(handlerSpy).toHaveBeenCalledTimes(1);
});
