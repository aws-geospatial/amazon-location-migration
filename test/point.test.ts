// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationPoint } from "../src/common";

describe("MigrationPoint", () => {
  test("should create point with x and y coordinates", () => {
    const point = new MigrationPoint(10, 20);
    expect(point.x).toBe(10);
    expect(point.y).toBe(20);
  });

  test("should correctly compare equal points", () => {
    const point1 = new MigrationPoint(10, 20);
    const point2 = new MigrationPoint(10, 20);
    expect(point1.equals(point2)).toBe(true);
  });

  test("should correctly compare unequal points", () => {
    const point1 = new MigrationPoint(10, 20);
    const point2 = new MigrationPoint(15, 20);
    expect(point1.equals(point2)).toBe(false);

    const point3 = new MigrationPoint(10, 25);
    expect(point1.equals(point3)).toBe(false);
  });

  test("should return false when comparing with null", () => {
    const point = new MigrationPoint(10, 20);
    expect(point.equals(null)).toBe(false);
  });

  test("should convert to string correctly", () => {
    const point = new MigrationPoint(10, 20);
    expect(point.toString()).toBe("(10, 20)");
  });

  test("should handle negative coordinates", () => {
    const point = new MigrationPoint(-10, -20);
    expect(point.x).toBe(-10);
    expect(point.y).toBe(-20);
    expect(point.toString()).toBe("(-10, -20)");
  });

  test("should handle zero coordinates", () => {
    const point = new MigrationPoint(0, 0);
    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
    expect(point.equals(new MigrationPoint(0, 0))).toBe(true);
  });

  test("should handle decimal coordinates", () => {
    const point = new MigrationPoint(10.5, 20.7);
    expect(point.x).toBe(10.5);
    expect(point.y).toBe(20.7);
  });
});
