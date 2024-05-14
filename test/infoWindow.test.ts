// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationMarker } from "../src/markers";
import { MigrationInfoWindow } from "../src/infoWindow";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Marker, Popup, PopupOptions } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

afterEach(() => {
  jest.clearAllMocks();
});

test("should set marker options", () => {
  const testInfoWindow = new MigrationInfoWindow({
    maxWidth: 100,
    position: { lat: testLat, lng: testLng },
  });

  const expectedMaplibreOptions: PopupOptions = {
    maxWidth: "100px",
  };

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup).toHaveBeenCalledWith(expectedMaplibreOptions);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
});

test("should set marker content option with string", () => {
  const testString = "Hello World!";
  const testInfoWindow = new MigrationInfoWindow({
    content: testString,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setText).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setText).toHaveBeenCalledWith(testString);
});

test("should set marker content option with string containing HTML", () => {
  const htmlString = "<h1>Hello World!</h1>";
  const testInfoWindow = new MigrationInfoWindow({
    content: htmlString,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setHTML).toHaveBeenCalledWith(htmlString);
});

test("should set marker content option with HTML elements", () => {
  const h1Element = document.createElement("h1");
  h1Element.textContent = "Hello World!";
  const testInfoWindow = new MigrationInfoWindow({
    content: h1Element,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(Popup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setDOMContent).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.setDOMContent).toHaveBeenCalledWith(h1Element);
});

test("should call open method on marker with anchor option", () => {
  const testInfoWindow = new MigrationInfoWindow({});
  const testMarker = new MigrationMarker({});

  testInfoWindow.open({
    anchor: testMarker,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setPopup).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setPopup).toHaveBeenCalledWith(testInfoWindow._getPopup());
  expect(Marker.prototype.togglePopup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.isOpen).toHaveBeenCalledTimes(1);
});

test("should call open method on marker with anchor parameter", () => {
  const testInfoWindow = new MigrationInfoWindow({});
  const testMarker = new MigrationMarker({});

  testInfoWindow.open(undefined, testMarker);

  expect(testInfoWindow).not.toBeNull();
  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setPopup).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setPopup).toHaveBeenCalledWith(testInfoWindow._getPopup());
  expect(Marker.prototype.togglePopup).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.isOpen).toHaveBeenCalledTimes(1);
});

test("should call open method on marker with lat lng set and map option", () => {
  const testInfoWindow = new MigrationInfoWindow({});
  const testMarker = new MigrationMarker({});
  const testMap = new MigrationMap(null, {});

  testInfoWindow.setPosition({ lat: testLat, lng: testLng });
  testInfoWindow.open({
    map: testMap,
  });

  expect(testInfoWindow).not.toBeNull();
  expect(testMarker).not.toBeNull();
  expect(testMap).not.toBeNull();
  expect(Popup.prototype.addTo).toHaveBeenCalledTimes(1);
  expect(Popup.prototype.addTo).toHaveBeenCalledWith(testMap._getMap());
});
