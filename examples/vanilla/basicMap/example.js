// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This a basic map example that just has a Google Map.
//
// This is meant to be showcased as the client logic that is able to remain untouched
// and retain the same functionality when using the Amazon Location Migration SDK.

function initMap() {
  const austinCoords = new google.maps.LatLng(30.268193, -97.7457518); // Austin, TX :)

  const map = new google.maps.Map(document.getElementById("map"), {
    center: austinCoords,
    zoom: 11,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    colorScheme: google.maps.ColorScheme.FOLLOW_SYSTEM,
  });
}
