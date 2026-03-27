// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationSize } from "../src/common";

describe("MigrationSize", () => {
  test("should create size with width and height", () => {
    const size = new MigrationSize(100, 200);
    expect(size.width).toBe(100);
    expect(size.height).toBe(200);
  });

  test("should accept optional unit parameters", () => {
    const size = new MigrationSize(100, 200, "px", "px");
    expect(size.width).toBe(100);
    expect(size.height).toBe(200);
  });

  test("should correctly compare equal sizes", () => {
    const size1 = new MigrationSize(100, 200);
    const size2 = new MigrationSize(100, 200);
    expect(size1.equals(size2)).toBe(true);
  });

  test("should correctly compare unequal sizes", () => {
    const size1 = new MigrationSize(100, 200);
    const size2 = new MigrationSize(150, 200);
    expect(size1.equals(size2)).toBe(false);

    const size3 = new MigrationSize(100, 250);
    expect(size1.equals(size3)).toBe(false);
  });

  test("should return false when comparing with null", () => {
    const size = new MigrationSize(100, 200);
    expect(size.equals(null)).toBe(false);
  });

  test("should convert to string correctly", () => {
    const size = new MigrationSize(100, 200);
    expect(size.toString()).toBe("(100, 200)");
  });

  test("should handle zero dimensions", () => {
    const size = new MigrationSize(0, 0);
    expect(size.width).toBe(0);
    expect(size.height).toBe(0);
    expect(size.equals(new MigrationSize(0, 0))).toBe(true);
  });

  test("should handle decimal dimensions", () => {
    const size = new MigrationSize(32.5, 64.7);
    expect(size.width).toBe(32.5);
    expect(size.height).toBe(64.7);
  });

  test("should handle negative dimensions", () => {
    const size = new MigrationSize(-10, -20);
    expect(size.width).toBe(-10);
    expect(size.height).toBe(-20);
  });
});
