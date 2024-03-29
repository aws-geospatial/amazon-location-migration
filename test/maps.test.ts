// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { GoogleLatLng, GoogleLatLngBounds } from "../src/googleCommon";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Map } from "maplibre-gl";

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
