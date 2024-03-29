// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MigrationMap } from "./maps";
import { MigrationMarker } from "./markers";

// This migration helper will replace classes/methods in the google.maps namespace
// to target our AWS Location Service migration server shim endpoint instead of
// the Google Maps API endpoint
// TODO: Move the region to be specified by url param also, but keep this as default
const region = "us-west-2";

// Parse URL params from the query string this script was imported with so we can retrieve
// params (e.g. API key, place index, etc...)
const currentScript = document.currentScript as HTMLScriptElement;
const currentScriptSrc = currentScript.src;
const queryString = currentScriptSrc.substring(currentScriptSrc.indexOf("?"));
const urlParams = new URLSearchParams(queryString);

// API key is required to be passed in, so if it's not we need to log an error and bail out
const apiKey = urlParams.get("apiKey");
if (!apiKey) {
  throw Error("Migration script missing 'apiKey' parameter.");
}

// Optional, but if user wants to perform any Places requests, this is required
const placeIndexName = urlParams.get("placeIndex");

// Optional, but if user wants to perform any Route requests, this is required
const routeCalculatorName = urlParams.get("routeCalculator");

// Optional, will invoke after migrationInit has been called
const postMigrationCallback = urlParams.get("callback");

// TODO: Query for map name
const styleUrl = `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/MigrationTestMap/style-descriptor?key=${apiKey}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).migrationInit = async function () {
  // Pass our style url (which includes the API key) to our Migration Map class
  MigrationMap.prototype._styleUrl = styleUrl;

  // Replace the Google Maps classes with our migration classes
  (window as any).google.maps.Map = MigrationMap;
  (window as any).google.maps.Marker = MigrationMarker;

  if (postMigrationCallback) {
    window[postMigrationCallback]();
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
