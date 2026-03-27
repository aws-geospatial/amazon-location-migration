// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Migration version of google.maps.Point
export class MigrationPoint implements google.maps.Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  equals(other: google.maps.Point | null): boolean {
    return other ? this.x === other.x && this.y === other.y : false;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
