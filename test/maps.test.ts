// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { GoogleLatLng, GoogleLatLngBounds, MigrationControlPosition } from "../src/googleCommon";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Map, MapOptions, NavigationControl } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

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
  };
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(Map.prototype.addControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-left");
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
  };
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(Map.prototype.addControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
});

test("should call setZoom from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setZoom(3);

  expect(Map.prototype.setZoom).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setZoom).toHaveBeenCalledWith(3);
});

test("should call setCenter from migration map with LatLng", () => {
  const testMap = new MigrationMap(null, {});
  const testCenter = GoogleLatLng(1, 2);

  testMap.setCenter(testCenter);

  expect(Map.prototype.setCenter).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setCenter).toHaveBeenCalledWith([2, 1]);
});

test("should call setCenter from migration map with LatLngLiteral", () => {
  const testMap = new MigrationMap(null, {});
  const testCenter = { lat: 3, lng: 4 };

  testMap.setCenter(testCenter);

  expect(Map.prototype.setCenter).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setCenter).toHaveBeenCalledWith([4, 3]);
});

test("should call setHeading from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setHeading(45);

  expect(Map.prototype.setBearing).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setBearing).toHaveBeenCalledWith(45);
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

  expect(Map.prototype.setCenter).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setCenter).toHaveBeenCalledWith([testLng, testLat]);
  expect(Map.prototype.setZoom).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setZoom).toHaveBeenCalledWith(9);
  expect(Map.prototype.setMaxZoom).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setMaxZoom).toHaveBeenCalledWith(18);
  expect(Map.prototype.setMinZoom).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setMinZoom).toHaveBeenCalledWith(2);
  expect(Map.prototype.setPitch).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setPitch).toHaveBeenCalledWith(45);
  expect(Map.prototype.setBearing).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setBearing).toHaveBeenCalledWith(90);
  expect(Map.prototype.addControl).toHaveBeenCalledTimes(2);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-left");
});

test("should call setOptions from migration map and remove NavigationControl", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    zoomControl: false,
  });

  expect(Map.prototype.addControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(Map.prototype.removeControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.removeControl).toHaveBeenCalledWith(expect.any(NavigationControl));
});

test("should call setOptions from migration map and add new NavigationControl", () => {
  const testMap = new MigrationMap(null, {
    zoomControl: false,
  });

  testMap.setOptions({
    zoomControl: true,
  });

  expect(Map.prototype.addControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
});

test("should call setOptions from migration map and add new NavigationControl with zoomControlOptions", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setOptions({
    zoomControlOptions: {
      position: MigrationControlPosition.RIGHT_TOP,
    },
  });

  expect(Map.prototype.addControl).toHaveBeenCalledTimes(2);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "top-right");
});

test("should call setTilt from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setTilt(30);

  expect(Map.prototype.setPitch).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setPitch).toHaveBeenCalledWith(30);
});

test("should call get methods from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.getCenter();
  testMap.getDiv();
  testMap.getHeading();
  testMap.getTilt();
  testMap.getZoom();

  expect(Map.prototype.getCenter).toHaveBeenCalledTimes(1);
  expect(Map.prototype.getContainer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.getBearing).toHaveBeenCalledTimes(1);
  expect(Map.prototype.getPitch).toHaveBeenCalledTimes(1);
  expect(Map.prototype.getZoom).toHaveBeenCalledTimes(1);
});

test("should call moveCamera from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.moveCamera({
    center: GoogleLatLng(testLat, testLng),
    zoom: 16,
    heading: 90,
    tilt: 45,
  });

  expect(Map.prototype.jumpTo).toHaveBeenCalledTimes(1);
  expect(Map.prototype.jumpTo).toHaveBeenCalledWith({
    center: [testLng, testLat],
    zoom: 16,
    bearing: 90,
    pitch: 45,
  });
});

test("should call panBy from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.panBy(50, 60);

  expect(Map.prototype.panBy).toHaveBeenCalledTimes(1);
  expect(Map.prototype.panBy).toHaveBeenCalledWith([50, 60]);
});

test("should call panTo from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.panTo({ lat: testLat, lng: testLng });

  expect(Map.prototype.panTo).toHaveBeenCalledTimes(1);
  expect(Map.prototype.panTo).toHaveBeenCalledWith([testLng, testLat]);
});

test("should call fitBounds from migration map", () => {
  const testMap = new MigrationMap(null, {});
  const testSouthWest = GoogleLatLng(1, 2);
  const testNorthEast = GoogleLatLng(3, 4);
  const testBounds = GoogleLatLngBounds(testSouthWest, testNorthEast);

  testMap.fitBounds(testBounds);

  expect(Map.prototype.fitBounds).toHaveBeenCalledTimes(1);
  expect(Map.prototype.fitBounds).toHaveBeenCalledWith([
    [testNorthEast.lng(), testNorthEast.lat()],
    [testSouthWest.lng(), testSouthWest.lat()],
  ]);
});
