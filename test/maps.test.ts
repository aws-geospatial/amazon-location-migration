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

afterEach(() => {
  jest.clearAllMocks();
});

test("should set migration map options", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: 30.268193, lng: -97.7457518 }, // Austin, TX :)
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
    center: [-97.7457518, 30.268193],
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
    center: { lat: 30.268193, lng: -97.7457518 }, // Austin, TX :)
    zoom: 9,
    zoomControlOptions: {
      position: MigrationControlPosition.BLOCK_START_INLINE_CENTER,
    },
  });

  const expectedMaplibreOptions: MapOptions = {
    container: null,
    style: undefined,
    center: [-97.7457518, 30.268193],
    zoom: 9,
  };
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(Map.prototype.addControl).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addControl).toHaveBeenCalledWith(expect.any(NavigationControl), "bottom-right");
});

test("should set migration map options with zoom options not available in MapLibre", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: 30.268193, lng: -97.7457518 }, // Austin, TX :)
    zoom: -2,
    minZoom: -2,
    maxZoom: 30,
  });

  const expectedMaplibreOptions: MapOptions = {
    container: null,
    style: undefined,
    center: [-97.7457518, 30.268193],
    zoom: 0,
    minZoom: 0,
    maxZoom: 24,
  };
  expect(Map).toHaveBeenCalledTimes(1);
  expect(Map).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should call setZoom from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.setZoom(3);

  expect(Map.prototype.setZoom).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setZoom).toHaveBeenCalledWith(3);
});

test("should call setCenter from migration map", () => {
  const testMap = new MigrationMap(null, {});
  const testCenter = GoogleLatLng(1, 2);

  testMap.setCenter(testCenter);

  expect(Map.prototype.setCenter).toHaveBeenCalledTimes(1);
  expect(Map.prototype.setCenter).toHaveBeenCalledWith([2, 1]);
});

test("should call getCenter from migration map", () => {
  const testMap = new MigrationMap(null, {});

  testMap.getCenter();

  expect(Map.prototype.getCenter).toHaveBeenCalledTimes(1);
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
