// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap, MigrationTrafficLayer } from "../src/maps";

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
  const trafficLayer = new MigrationTrafficLayer();

  expect(trafficLayer.getMap()).toBeUndefined();
});

test("should return correct map after being set", () => {
  const testMap = new MigrationMap(null, {});
  const trafficLayer = new MigrationTrafficLayer();

  trafficLayer.setMap(testMap);

  expect(trafficLayer.getMap()).toBe(testMap);
});

test("should set map through constructor options", () => {
  const testMap = new MigrationMap(null, {});
  const trafficLayer = new MigrationTrafficLayer({
    map: testMap,
  });

  expect(trafficLayer.getMap()).toBe(testMap);
});

test("should set map through setOptions", () => {
  const testMap = new MigrationMap(null, {});
  const trafficLayer = new MigrationTrafficLayer();

  trafficLayer.setOptions({
    map: testMap,
  });

  expect(trafficLayer.getMap()).toBe(testMap);
});
