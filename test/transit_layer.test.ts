// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap, MigrationTransitLayer } from "../src/maps";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should return undefined map by default", () => {
  const transitLayer = new MigrationTransitLayer();

  expect(transitLayer.getMap()).toBeUndefined();
});

test("should return correct map after being set", () => {
  const testMap = new MigrationMap(null, {});
  const transitLayer = new MigrationTransitLayer();

  transitLayer.setMap(testMap);

  expect(transitLayer.getMap()).toBe(testMap);
});

test("should set map through constructor options", () => {
  const testMap = new MigrationMap(null, {});
  const transitLayer = new MigrationTransitLayer({
    map: testMap,
  });

  expect(transitLayer.getMap()).toBe(testMap);
});

test("should set map through setOptions", () => {
  const testMap = new MigrationMap(null, {});
  const transitLayer = new MigrationTransitLayer();

  transitLayer.setOptions({
    map: testMap,
  });

  expect(transitLayer.getMap()).toBe(testMap);
});
