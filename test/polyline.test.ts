// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap, MigrationPolyline } from "../src/maps";
import { MigrationLatLng } from "../src/common";

// Mock maplibre because it requires a valid DOM container to create a Map
jest.mock("maplibre-gl");
import { Map as MapLibreMap } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX
const testLng = -97.7457518;
const testLat2 = 30.308193;
const testLng2 = -97.7857518;

afterEach(() => {
  jest.clearAllMocks();
});

describe("MigrationPolyline", () => {
  test("should create polyline with path", () => {
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    const polyline = new MigrationPolyline({
      path: path,
    });

    expect(polyline).not.toBeNull();
    expect(polyline.path).toEqual(path);
  });

  test("should create polyline with options", () => {
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    const polyline = new MigrationPolyline({
      path: path,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 5,
      geodesic: true,
      visible: true,
      zIndex: 100,
    });

    expect(polyline.path).toEqual(path);
    expect(polyline.strokeColor).toBe("#FF0000");
    expect(polyline.strokeOpacity).toBe(0.8);
    expect(polyline.strokeWeight).toBe(5);
    expect(polyline.geodesic).toBe(true);
    expect(polyline.visible).toBe(true);
    expect(polyline.zIndex).toBe(100);
  });

  test("should get and set draggable", () => {
    const polyline = new MigrationPolyline();

    expect(polyline.getDraggable()).toBe(false);

    polyline.setDraggable(true);
    expect(polyline.getDraggable()).toBe(true);
  });

  test("should get and set editable", () => {
    const polyline = new MigrationPolyline();

    expect(polyline.getEditable()).toBe(false);

    polyline.setEditable(true);
    expect(polyline.getEditable()).toBe(true);
  });

  test("should get and set path", () => {
    const polyline = new MigrationPolyline();
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    polyline.setPath(path);
    expect(polyline.path).toEqual(path);

    const retrievedPath = polyline.getPath();
    expect(retrievedPath.getLength()).toBe(2);
    expect(retrievedPath.getAt(0)).toEqual(path[0]);
    expect(retrievedPath.getAt(1)).toEqual(path[1]);
  });

  test("should clear path when set to null", () => {
    const polyline = new MigrationPolyline();
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    polyline.setPath(path);
    expect(polyline.path.length).toBe(2);

    polyline.setPath(null);
    expect(polyline.path.length).toBe(0);
  });

  test("should not draw polyline without map", () => {
    const polyline = new MigrationPolyline();
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    // Setting path without a map should not throw
    polyline.setPath(path);
    expect(polyline.path.length).toBe(2);
    expect(polyline.getMap()).toBeNull();
  });

  test("should not draw polyline with empty path", () => {
    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getSource: jest.fn().mockReturnValue(null),
      getLayer: jest.fn().mockReturnValue(null),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const polyline = new MigrationPolyline({
      path: [], // Empty path
      map: testMap as unknown as google.maps.Map,
    });

    expect(polyline.getMap()).toBe(testMap);
    // Should not call addSource/addLayer with empty path
    expect(mockMapLibreMap.addSource).not.toHaveBeenCalled();
    expect(mockMapLibreMap.addLayer).not.toHaveBeenCalled();
  });

  test("should convert LatLngLiterals in path", () => {
    const polyline = new MigrationPolyline();
    const path = [
      { lat: testLat, lng: testLng },
      { lat: testLat2, lng: testLng2 },
    ];

    polyline.setPath(path);
    expect(polyline.path.length).toBe(2);
    expect(polyline.path[0]).toBeInstanceOf(MigrationLatLng);
    expect(polyline.path[0].lat()).toBe(testLat);
    expect(polyline.path[0].lng()).toBe(testLng);
  });

  test("should set path from MVCArray with LatLngLiterals", () => {
    const polyline = new MigrationPolyline();
    const pathArray = [
      { lat: testLat, lng: testLng },
      { lat: testLat2, lng: testLng2 },
    ];

    const mvcPath = {
      getArray: () => pathArray,
    };

    polyline.setPath(mvcPath as unknown as google.maps.MVCArray<google.maps.LatLng>);
    expect(polyline.path.length).toBe(2);
    expect(polyline.path[0]).toBeInstanceOf(MigrationLatLng);
    expect(polyline.path[0].lat()).toBe(testLat);
  });

  test("should set path with mixed LatLng and LatLngLiterals", () => {
    const polyline = new MigrationPolyline();
    const mixedPath = [
      new MigrationLatLng(testLat, testLng), // Already a MigrationLatLng
      { lat: testLat2, lng: testLng2 }, // LatLngLiteral
    ];

    polyline.setPath(mixedPath);
    expect(polyline.path.length).toBe(2);
    expect(polyline.path[0]).toBeInstanceOf(MigrationLatLng);
    expect(polyline.path[1]).toBeInstanceOf(MigrationLatLng);
    expect(polyline.path[0].lat()).toBe(testLat);
    expect(polyline.path[1].lat()).toBe(testLat2);
  });

  test("should set path from MVCArray with mixed types", () => {
    const polyline = new MigrationPolyline();
    const mixedArray = [new MigrationLatLng(testLat, testLng), { lat: testLat2, lng: testLng2 }];

    const mvcPath = {
      getArray: () => mixedArray,
    };

    polyline.setPath(mvcPath as unknown as google.maps.MVCArray<google.maps.LatLng>);
    expect(polyline.path.length).toBe(2);
    expect(polyline.path[0]).toBeInstanceOf(MigrationLatLng);
    expect(polyline.path[1]).toBeInstanceOf(MigrationLatLng);
  });

  test("should get and set visible", () => {
    const polyline = new MigrationPolyline();

    expect(polyline.getVisible()).toBe(true);

    polyline.setVisible(false);
    expect(polyline.getVisible()).toBe(false);
  });

  test("should get map", () => {
    const testMap = new MigrationMap(null, {});
    const polyline = new MigrationPolyline({ map: testMap as unknown as google.maps.Map });

    expect(polyline.getMap()).toBe(testMap);
  });

  test("should set map to null and remove layers", () => {
    const mockSource = {
      setData: jest.fn(),
    };

    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getLayer: jest.fn().mockReturnValue(true),
      getSource: jest.fn().mockReturnValue(mockSource),
      removeLayer: jest.fn(),
      removeSource: jest.fn(),
      setLayoutProperty: jest.fn(),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    const polyline = new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
    });

    // Now remove from map
    polyline.setMap(null);

    expect(mockMapLibreMap.removeLayer).toHaveBeenCalled();
    expect(mockMapLibreMap.removeSource).toHaveBeenCalled();
    expect(polyline.getMap()).toBeNull();
  });

  test("should update path through MVCArray methods", () => {
    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    const polyline = new MigrationPolyline({ path: path });
    const mvcPath = polyline.getPath();

    // Test push
    const newPoint = new MigrationLatLng(31.0, -98.0);
    mvcPath.push(newPoint);
    expect(polyline.path.length).toBe(3);
    expect(polyline.path[2]).toBe(newPoint);

    // Test pop
    const poppedPoint = mvcPath.pop();
    expect(poppedPoint).toBe(newPoint);
    expect(polyline.path.length).toBe(2);

    // Test insertAt
    mvcPath.insertAt(1, newPoint);
    expect(polyline.path.length).toBe(3);
    expect(polyline.path[1]).toBe(newPoint);

    // Test removeAt
    const removedPoint = mvcPath.removeAt(1);
    expect(removedPoint).toBe(newPoint);
    expect(polyline.path.length).toBe(2);

    // Test setAt
    const anotherPoint = new MigrationLatLng(32.0, -99.0);
    mvcPath.setAt(0, anotherPoint);
    expect(polyline.path[0]).toBe(anotherPoint);

    // Test clear
    mvcPath.clear();
    expect(polyline.path.length).toBe(0);

    // Test pop on empty array
    const emptyPop = mvcPath.pop();
    expect(emptyPop).toBeUndefined();
    expect(polyline.path.length).toBe(0);

    // Test getArray
    const arrayFromMVC = mvcPath.getArray();
    expect(arrayFromMVC).toBe(polyline.path);
    expect(arrayFromMVC.length).toBe(0);

    // Test getAt with invalid index
    const invalidElement = mvcPath.getAt(999);
    expect(invalidElement).toBeUndefined();

    // Test getLength
    expect(mvcPath.getLength()).toBe(0);
  });

  test("should set options updates polyline properties", () => {
    const polyline = new MigrationPolyline();

    polyline.setOptions({
      strokeColor: "#00FF00",
      strokeOpacity: 0.5,
      strokeWeight: 10,
      geodesic: true,
      visible: false,
      draggable: true,
      editable: true,
      clickable: false,
      zIndex: 50,
    });

    expect(polyline.strokeColor).toBe("#00FF00");
    expect(polyline.strokeOpacity).toBe(0.5);
    expect(polyline.strokeWeight).toBe(10);
    expect(polyline.geodesic).toBe(true);
    expect(polyline.visible).toBe(false);
    expect(polyline.draggable).toBe(true);
    expect(polyline.editable).toBe(true);
    expect(polyline.clickable).toBe(false);
    expect(polyline.zIndex).toBe(50);
  });

  test("should handle null options", () => {
    const polyline = new MigrationPolyline();
    const originalColor = polyline.strokeColor;

    polyline.setOptions(null);

    expect(polyline.strokeColor).toBe(originalColor); // Should not change
  });

  test("should draw polyline on map when style is loaded", () => {
    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getSource: jest.fn().mockReturnValue(null),
      getLayer: jest.fn().mockReturnValue(null),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 5,
    });

    expect(mockMapLibreMap.addSource).toHaveBeenCalledWith(
      expect.stringContaining("polyline-source-"),
      expect.objectContaining({
        type: "geojson",
        data: expect.objectContaining({
          type: "Feature",
          geometry: expect.objectContaining({
            type: "LineString",
            coordinates: [
              [testLng, testLat],
              [testLng2, testLat2],
            ],
          }),
        }),
      }),
    );

    expect(mockMapLibreMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining("polyline-layer-"),
        type: "line",
        source: expect.stringContaining("polyline-source-"),
        paint: expect.objectContaining({
          "line-color": "#FF0000",
          "line-opacity": 0.8,
          "line-width": 5,
        }),
      }),
    );
  });

  test("should queue drawing when style is not loaded", () => {
    let styleLoadCallback: (() => void) | null = null;

    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(false).mockReturnValueOnce(false).mockReturnValue(true),
      on: jest.fn(),
      once: jest.fn((event: string, callback: () => void) => {
        if (event === "style.load") {
          styleLoadCallback = callback;
        }
      }),
      getSource: jest.fn().mockReturnValue(null),
      getLayer: jest.fn().mockReturnValue(null),
      addSource: jest.fn(),
      addLayer: jest.fn(),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
    });

    expect(mockMapLibreMap.once).toHaveBeenCalledWith("style.load", expect.any(Function));

    // Trigger the callback
    if (styleLoadCallback) {
      styleLoadCallback();
      expect(mockMapLibreMap.addSource).toHaveBeenCalled();
      expect(mockMapLibreMap.addLayer).toHaveBeenCalled();
    }
  });

  test("should update existing polyline data when already drawn", () => {
    const mockSource = {
      setData: jest.fn(),
    };

    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getSource: jest.fn().mockReturnValue(mockSource),
      getLayer: jest.fn().mockReturnValue(true),
      setLayoutProperty: jest.fn(),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    const polyline = new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
    });

    // Clear the mock calls from initial creation
    mockSource.setData.mockClear();
    mockMapLibreMap.setLayoutProperty.mockClear();

    // Update path
    const newPath = [new MigrationLatLng(31.0, -98.0), new MigrationLatLng(31.1, -98.1)];
    polyline.setPath(newPath);

    expect(mockSource.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Feature",
        geometry: expect.objectContaining({
          type: "LineString",
          coordinates: [
            [-98.0, 31.0],
            [-98.1, 31.1],
          ],
        }),
      }),
    );
  });

  test("should remove orphaned layer when source is missing", () => {
    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getSource: jest.fn().mockReturnValue(null), // Source missing
      getLayer: jest.fn().mockReturnValue(true), // But layer exists
      removeLayer: jest.fn(),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
    });

    expect(mockMapLibreMap.removeLayer).toHaveBeenCalled();
    expect(mockMapLibreMap.addSource).toHaveBeenCalled();
    expect(mockMapLibreMap.addLayer).toHaveBeenCalled();
  });

  test("should draw invisible polyline when visible is false", () => {
    const mockMapLibreMap = {
      isStyleLoaded: jest.fn().mockReturnValue(true),
      addSource: jest.fn(),
      addLayer: jest.fn(),
      getSource: jest.fn().mockReturnValue(null),
      getLayer: jest.fn().mockReturnValue(null),
    };

    const testMap = new MigrationMap(null, {});
    testMap._setMap(mockMapLibreMap as unknown as MapLibreMap);

    const path = [new MigrationLatLng(testLat, testLng), new MigrationLatLng(testLat2, testLng2)];

    new MigrationPolyline({
      path: path,
      map: testMap as unknown as google.maps.Map,
      visible: false,
    });

    expect(mockMapLibreMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          visibility: "none",
        }),
      }),
    );
  });
});
