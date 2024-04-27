// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "../src/maps";
import { MigrationMarker } from "../src/markers";

// Mock maplibre because it requires a valid DOM container to create a Map
// We don't need to verify maplibre itself, we just need to verify that
// the values we pass to our google migration classes get transformed
// correctly and our called
jest.mock("maplibre-gl");
import { Map, Marker, MarkerOptions } from "maplibre-gl";

const testLat = 30.268193; // Austin, TX :)
const testLng = -97.7457518;

afterEach(() => {
  jest.clearAllMocks();
});

test("should set marker options", () => {
  const testMap = new MigrationMap(null, {});
  const testMarker = new MigrationMarker({
    draggable: false,
    gmpDraggable: true,
    position: { lat: testLat, lng: testLng },
    opacity: 0.5,
    map: testMap,
  });

  expect(testMarker).not.toBeNull();
  expect(Marker.prototype.setDraggable).toHaveBeenCalledTimes(2);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(false);
  expect(Marker.prototype.setDraggable).toHaveBeenCalledWith(true);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setLngLat).toHaveBeenCalledWith([testLng, testLat]);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.setOpacity).toHaveBeenCalledWith(0.5);
  expect(Marker.prototype.addTo).toHaveBeenCalledTimes(1);
  expect(Marker.prototype.addTo).toHaveBeenCalledWith(expect.any(Map));
});

test("should set marker with url content", () => {
  const redDotImg = "../images/red_dot.png";
  new MigrationMarker({
    content: redDotImg,
  });

  const expectedImage = new Image();
  expectedImage.src = redDotImg;
  const expectedMaplibreOptions: MarkerOptions = {
    element: expectedImage,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with html content", () => {
  const pinkStarImg = document.createElement("img");
  pinkStarImg.src = "../images/pink_star.png";
  new MigrationMarker({
    content: pinkStarImg,
  });

  const expectedMaplibreOptions: MarkerOptions = {
    element: pinkStarImg,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with url icon", () => {
  const blueHeartImg = "../images/blue_heart.png";
  new MigrationMarker({
    icon: blueHeartImg,
  });

  const expectedImage = new Image();
  expectedImage.src = blueHeartImg;
  const expectedMaplibreOptions: MarkerOptions = {
    element: expectedImage,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});

test("should set marker with icon object", () => {
  const redDotImg = {
    url: "../images/red_dot.png",
  };
  new MigrationMarker({
    icon: redDotImg,
  });

  const expectedImage = new Image();
  expectedImage.src = redDotImg.url;
  const expectedMaplibreOptions: MarkerOptions = {
    element: expectedImage,
  };

  expect(Marker).toHaveBeenCalledTimes(1);
  expect(Marker).toHaveBeenCalledWith(expectedMaplibreOptions);
});
