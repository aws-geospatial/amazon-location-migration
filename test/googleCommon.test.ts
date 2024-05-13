// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationLatLng, MigrationLatLngBounds } from "../src/googleCommon";

afterEach(() => {
  jest.clearAllMocks();
});

test("should construct LatLng with two numbers", () => {
  const position = new MigrationLatLng(1, 2);

  expect(position.lat()).toStrictEqual(1);
  expect(position.lng()).toStrictEqual(2);
});

test("should clamp latitude to -90 by default", () => {
  const position = new MigrationLatLng(-100, 2);

  expect(position.lat()).toStrictEqual(-90);
  expect(position.lng()).toStrictEqual(2);
});

test("should clamp latitude to 90 by default", () => {
  const position = new MigrationLatLng(100, 2);

  expect(position.lat()).toStrictEqual(90);
  expect(position.lng()).toStrictEqual(2);
});

test("should wrap longitude when given a value less than -180", () => {
  const position = new MigrationLatLng(-100, -200);

  expect(position.lat()).toStrictEqual(-90);
  expect(position.lng()).toStrictEqual(160);
});

test("should wrap longitude when given a value greater than 180", () => {
  const position = new MigrationLatLng(110, 220);

  expect(position.lat()).toStrictEqual(90);
  expect(position.lng()).toStrictEqual(-140);
});

test("shouldn't clamp or wrap if specified", () => {
  const position = new MigrationLatLng(110, 220, true);

  expect(position.lat()).toStrictEqual(110);
  expect(position.lng()).toStrictEqual(220);
});

test("should construct LatLng from LatLngLiteral", () => {
  const position = new MigrationLatLng({ lat: 1, lng: 2 });

  expect(position.lat()).toStrictEqual(1);
  expect(position.lng()).toStrictEqual(2);
});

test("should construct LatLng from LatLng", () => {
  const initialPosition = new MigrationLatLng(3, 4);
  const position = new MigrationLatLng(initialPosition);

  expect(position.lat()).toStrictEqual(3);
  expect(position.lng()).toStrictEqual(4);
});

test("should construct LatLng from LatLngLiteral with no clamp", () => {
  const position = new MigrationLatLng({ lat: 120, lng: 230 }, true);

  expect(position.lat()).toStrictEqual(120);
  expect(position.lng()).toStrictEqual(230);
});

test("should construct LatLng from LatLng with no clamp", () => {
  const initialPosition = new MigrationLatLng(130, 240, true);
  const position = new MigrationLatLng(initialPosition, true);

  expect(position.lat()).toStrictEqual(130);
  expect(position.lng()).toStrictEqual(240);
});

test("should compare LatLng to LatLng", () => {
  const p1 = new MigrationLatLng(1, 2);
  const p2 = new MigrationLatLng(1, 2);
  const p3 = new MigrationLatLng(1, 3);
  const p4 = new MigrationLatLng(3, 2);
  const p5 = new MigrationLatLng(5, 5);

  expect(p1.equals(p2)).toStrictEqual(true);
  expect(p1.equals(p3)).toStrictEqual(false);
  expect(p1.equals(p4)).toStrictEqual(false);
  expect(p1.equals(p5)).toStrictEqual(false);
  expect(p1.equals(undefined)).toStrictEqual(false);
});

test("should return toString in expected format for LatLng", () => {
  const position = new MigrationLatLng(1, 2);

  expect(position.toString()).toStrictEqual("(1, 2)");
});

test("should return toJSON in expected format for LatLng", () => {
  const position = new MigrationLatLng(1, 2);

  expect(position.toJSON()).toStrictEqual({ lat: 1, lng: 2 });
});

test("should return toUrlValue with decimal precision of 6 digits by default for LatLng", () => {
  const position = new MigrationLatLng(0.1234567, 2);

  expect(position.toUrlValue()).toStrictEqual("0.123457,2");
});

test("should return toUrlValue with specified decimal precision for LatLng", () => {
  const position = new MigrationLatLng(0.1234567, 2);

  expect(position.toUrlValue(4)).toStrictEqual("0.1235,2");
});

test("can construct an empty LatLngBounds", () => {
  const bounds = new MigrationLatLngBounds();

  expect(bounds.isEmpty()).toStrictEqual(true);
});

test("should construct LatLngBounds with two LatLngs", () => {
  const sw = new MigrationLatLng(1, 2);
  const ne = new MigrationLatLng(3, 4);
  const bounds = new MigrationLatLngBounds(sw, ne);

  expect(bounds.getSouthWest().lat()).toStrictEqual(1);
  expect(bounds.getSouthWest().lng()).toStrictEqual(2);
  expect(bounds.getNorthEast().lat()).toStrictEqual(3);
  expect(bounds.getNorthEast().lng()).toStrictEqual(4);
});

test("should construct LatLngBounds from LatLngBounds", () => {
  const sw = new MigrationLatLng(1, 2);
  const ne = new MigrationLatLng(3, 4);
  const bounds = new MigrationLatLngBounds(sw, ne);
  const anotherBounds = new MigrationLatLngBounds(bounds);

  expect(anotherBounds.getSouthWest().lat()).toStrictEqual(1);
  expect(anotherBounds.getSouthWest().lng()).toStrictEqual(2);
  expect(anotherBounds.getNorthEast().lat()).toStrictEqual(3);
  expect(anotherBounds.getNorthEast().lng()).toStrictEqual(4);
});

test("should construct LatLngBounds from LatLngBoundsLiteral", () => {
  const west = 1;
  const south = 2;
  const east = 3;
  const north = 4;
  const bounds = new MigrationLatLngBounds({ west, south, east, north });

  expect(bounds.getSouthWest().lat()).toStrictEqual(south);
  expect(bounds.getSouthWest().lng()).toStrictEqual(west);
  expect(bounds.getNorthEast().lat()).toStrictEqual(north);
  expect(bounds.getNorthEast().lng()).toStrictEqual(east);
});

test("should return true if point is in LatLngBounds", () => {
  const sw = new MigrationLatLng(0, 0);
  const ne = new MigrationLatLng(5, 5);
  const bounds = new MigrationLatLngBounds(sw, ne);

  expect(bounds.contains(new MigrationLatLng(3, 3))).toStrictEqual(true);
});

test("should return true if bounds are equal", () => {
  const sw = new MigrationLatLng(0, 0);
  const ne = new MigrationLatLng(5, 5);
  const bounds = new MigrationLatLngBounds(sw, ne);
  const anotherBounds = new MigrationLatLngBounds(bounds);

  expect(bounds.equals(anotherBounds)).toStrictEqual(true);
});

test("bounds should extend to include LatLng", () => {
  const sw = new MigrationLatLng(0, 0);
  const ne = new MigrationLatLng(5, 5);
  const bounds = new MigrationLatLngBounds(sw, ne);

  const newBounds = bounds.extend(new MigrationLatLng(10, 11));

  expect(bounds.getSouthWest().lat()).toStrictEqual(0);
  expect(bounds.getSouthWest().lng()).toStrictEqual(0);
  expect(bounds.getNorthEast().lat()).toStrictEqual(10);
  expect(bounds.getNorthEast().lng()).toStrictEqual(11);

  // extend should also return an updated bounds as well
  expect(newBounds.getSouthWest().lat()).toStrictEqual(0);
  expect(newBounds.getSouthWest().lng()).toStrictEqual(0);
  expect(newBounds.getNorthEast().lat()).toStrictEqual(10);
  expect(newBounds.getNorthEast().lng()).toStrictEqual(11);
});

test("should return center of bounds", () => {
  const sw = new MigrationLatLng(0, 0);
  const ne = new MigrationLatLng(5, 6);
  const bounds = new MigrationLatLngBounds(sw, ne);

  const center = bounds.getCenter();

  expect(center.lat()).toStrictEqual(2.5);
  expect(center.lng()).toStrictEqual(3);
});

test("should return toJSON in expected format for LatLngBounds", () => {
  const sw = new MigrationLatLng(0, 1);
  const ne = new MigrationLatLng(2, 3);
  const bounds = new MigrationLatLngBounds(sw, ne);

  const boundsLiteral = bounds.toJSON();

  expect(boundsLiteral.south).toStrictEqual(0);
  expect(boundsLiteral.west).toStrictEqual(1);
  expect(boundsLiteral.north).toStrictEqual(2);
  expect(boundsLiteral.east).toStrictEqual(3);
});

test("should calculate span of LatLngBounds", () => {
  const west = 0;
  const south = 1;
  const east = 3;
  const north = 8;
  const bounds = new MigrationLatLngBounds({ west, south, east, north });

  const span = bounds.toSpan();

  expect(span.lat()).toStrictEqual(north - south);
  expect(span.lng()).toStrictEqual(east - west);
});

test("should return toString in expected format for LatLngBounds", () => {
  const west = 1;
  const south = 2;
  const east = 3;
  const north = 4;
  const bounds = new MigrationLatLngBounds({ west, south, east, north });

  expect(bounds.toString()).toStrictEqual("((2, 1), (4, 3))");
});

test("should return toUrlValue with decimal precision of 6 digits by default for LatLngBounds", () => {
  const west = 1;
  const south = 2.028348934;
  const east = 3.984853201;
  const north = 4.32;
  const bounds = new MigrationLatLngBounds({ west, south, east, north });

  expect(bounds.toUrlValue()).toStrictEqual("2.02835,1,4.32,3.98485");
});

test("should return toUrlValue with specified decimal precision for LatLngBounds", () => {
  const west = 1;
  const south = 2.028348934;
  const east = 3.984853201;
  const north = 4.32;
  const bounds = new MigrationLatLngBounds({ west, south, east, north });

  expect(bounds.toUrlValue(3)).toStrictEqual("2.03,1,4.32,3.98");
});

test("bounds should extend to include LatLngBounds", () => {
  const sw = new MigrationLatLng(1, 1);
  const ne = new MigrationLatLng(4, 5);
  const bounds = new MigrationLatLngBounds(sw, ne);

  const otherSw = new MigrationLatLng(0, 0);
  const otherNe = new MigrationLatLng(5, 5);
  const otherBounds = new MigrationLatLngBounds(otherSw, otherNe);

  const newBounds = bounds.union(otherBounds);

  expect(bounds.getSouthWest().lat()).toStrictEqual(0);
  expect(bounds.getSouthWest().lng()).toStrictEqual(0);
  expect(bounds.getNorthEast().lat()).toStrictEqual(5);
  expect(bounds.getNorthEast().lng()).toStrictEqual(5);

  // union should also return an updated bounds as well
  expect(newBounds.getSouthWest().lat()).toStrictEqual(0);
  expect(newBounds.getSouthWest().lng()).toStrictEqual(0);
  expect(newBounds.getNorthEast().lat()).toStrictEqual(5);
  expect(newBounds.getNorthEast().lng()).toStrictEqual(5);
});
