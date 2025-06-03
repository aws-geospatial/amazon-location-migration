// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// This example showcases importing the SDK through the NPM Loader.
// The underlying logic is the same as the Autocomplete example.
//
// This is meant to be showcased as the client logic that is able to remain largely untouched
// and retain the same functionality when using the Amazon Location Migration SDK.

// In production, this would be imported from "@aws/amazon-location-migration-sdk"
import { Loader } from "../../dist/esm/index";

// This initMap has all of the actual implementation of the example so that we can
// isolate show-casing the NPM Loader usage below
import { initMap } from "./logic";

const loader = new Loader({
  apiKey: "{{AMAZON_LOCATION_API_KEY}}",
  region: "{{REGION}}", // The only difference in the API call is needing to add your region
  version: "weekly",
});

// Load the SDK and then invoke our underlying logic that sets up the example
loader.load().then(initMap);
