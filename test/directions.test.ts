// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationDirectionsRenderer } from "../src/directions";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Map, Marker } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

jest.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

test("should set directionsrenderer options", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testMarkerOptions = {};
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: testMarkerOptions,
    preserveViewport: true,
    suppressMarkers: true,
    suppressPolylines: true,
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(testDirectionsRenderer._getMarkers()).toStrictEqual([]);
  expect(testDirectionsRenderer.getMap()).toBe(testMap);
  expect(testDirectionsRenderer._getMarkerOptions()).toBe(testMarkerOptions);
  expect(testDirectionsRenderer._getPreserveViewport()).toBe(true);
  expect(testDirectionsRenderer._getSuppressMarkers()).toBe(true);
  expect(testDirectionsRenderer._getSuppressPolylines()).toBe(true);
});

test("should set directionsrenderer directions option", () => {
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    directions: {
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
    },
  });

  expect(testDirectionsRenderer).not.toBeNull();
  expect(Map.prototype.addSource).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
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
  });

  expect(Map.prototype.addSource).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer twice", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});
  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
  });

  testDirectionsRenderer.setDirections({
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
  });

  testDirectionsRenderer.setDirections({
    routes: [
      {
        bounds: null,
        legs: [
          {
            geometry: {
              LineString: 0,
            },
            start_location: { lat: 2, lng: 2 },
            end_location: { lat: 3, lng: 3 },
          },
        ],
      },
    ],
  });

  expect(Map.prototype.addSource).toHaveBeenCalledTimes(2);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(2);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "#73B9FF",
      "line-width": 8,
      "line-opacity": 0.5,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(4);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with all polylineOptions set", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Blue",
      strokeWeight: 10,
      strokeOpacity: 0.1,
      visible: false,
    },
  });

  testDirectionsRenderer.setDirections({
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
  });

  expect(Map.prototype.addSource).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "none",
    },
    paint: {
      "line-color": "Blue",
      "line-width": 10,
      "line-opacity": 0.1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeColor set", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeColor: "Red",
    },
  });

  testDirectionsRenderer.setDirections({
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
  });

  expect(Map.prototype.addSource).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Red",
      "line-width": 3,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call setDirections method on directionsrenderer with polylineOptions strokeWeight set", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
    markerOptions: {},
    polylineOptions: {
      strokeWeight: 1,
    },
  });

  testDirectionsRenderer.setDirections({
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
  });

  expect(Map.prototype.addSource).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addSource).toHaveBeenCalledWith("route", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: 0,
      },
    },
  });
  expect(Map.prototype.addLayer).toHaveBeenCalledTimes(1);
  expect(Map.prototype.addLayer).toHaveBeenCalledWith({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "Black",
      "line-width": 1,
      "line-opacity": 1,
    },
  });
  expect(Marker).toHaveBeenCalledTimes(2);
  expect(testDirectionsRenderer._getMarkers().length).toBe(2);
});

test("should call getDirections method on directionsrenderer", () => {
  globalThis.structuredClone = jest.fn().mockReturnValue({});

  const testMap = new MigrationMap(null, {
    center: { lat: testLat, lng: testLng },
    zoom: 9,
  });
  const testDirectionsRenderer = new MigrationDirectionsRenderer({
    map: testMap,
  });
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

  const result = testDirectionsRenderer.getDirections();

  expect(result).toBe(directions);
});
