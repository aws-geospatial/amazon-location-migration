// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This example showcases importing the SDK through the NPM Loader.
// The underlying logic is the same as the Autocomplete example.
//
// This is meant to be showcased as the client logic that is able to remain largely untouched
// and retain the same functionality when using the Amazon Location Migration SDK.

import { Loader } from "@googlemaps/js-api-loader";

// This initMap has all of the actual implementation of the example so that we can
// isolate show-casing the NPM Loader usage below
import { initMap } from "./logic";

const loader = new Loader({
  apiKey: "{{GOOGLE_API_KEY}}",
  version: "weekly",
});

// Load the SDK and then invoke our underlying logic that sets up the example
loader.load().then(initMap);
