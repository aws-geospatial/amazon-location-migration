// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Migration version of google.maps.Size
export class MigrationSize implements google.maps.Size {
  width: number;
  height: number;

  constructor(width: number, height: number, widthUnit?: string, heightUnit?: string) {
    this.width = width;
    this.height = height;
    // Note: widthUnit and heightUnit are accepted for compatibility but not stored
    // as they're rarely used and typically default to pixels
  }

  equals(other: google.maps.Size | null): boolean {
    return other ? this.width === other.width && this.height === other.height : false;
  }

  toString(): string {
    return `(${this.width}, ${this.height})`;
  }
}
