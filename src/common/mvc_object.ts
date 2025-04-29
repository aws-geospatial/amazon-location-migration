// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export class MigrationMVCObject implements google.maps.MVCObject {
  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  addListener(eventName: string, handler): google.maps.MapsEventListener {
    console.error("addListener not supported");

    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    return { remove: () => {} };
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  bindTo(key: string, target: google.maps.MVCObject, targetKey?: string | null, noNotify?: boolean): void {
    console.error("bindTo not supported");
  }

  get(key: string) {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      return this[key];
    }

    return undefined;
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  notify(key: string): void {
    console.error("notify not supported");
  }

  set(key: string, value: unknown): void {
    this[key] = value;
  }

  setValues(values?: object | null): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  }

  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  unbind(key: string): void {
    console.error("unbind not supported");
  }

  unbindAll(): void {
    console.error("unbindAll not supported");
  }
}
