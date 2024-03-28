// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// We need to declare type definitions for any google specific classes that need to be returned
// in responses. This is because the google namespace will only be available dynamically
// if the user is loading both the google API and our migration adapter, so it won't be present
// when using the migration adapter in standalone mode, when buildling the bundled script, or when running unit tests.
declare namespace google.maps {
  export class LatLng {
    constructor(lat: number, lng: number, noWrap?: boolean);

    lat(): number;
    lng(): number;
  }
}
