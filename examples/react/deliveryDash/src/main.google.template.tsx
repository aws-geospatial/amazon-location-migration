// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Google Maps entry point Generated from main.google.template.tsx */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MapProvider } from "./MapConfigContext";
import { initGoogleMaps } from "./loaderConfig.google";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MapProvider initGoogleMaps={initGoogleMaps}>
      <App />
    </MapProvider>
  </React.StrictMode>,
);
