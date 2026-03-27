// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, ReactNode } from "react";

/** Map initialization function type */
type InitMapsFn = () => Promise<{
  maps?: typeof google.maps;
  places?: google.maps.PlacesLibrary;
  geometry?: google.maps.GeometryLibrary;
  marker?: google.maps.MarkerLibrary;
}>;

interface MapContextValue {
  initGoogleMaps: InitMapsFn;
}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
  children: ReactNode;
  initGoogleMaps: InitMapsFn;
}

export function MapProvider({ children, initGoogleMaps }: MapProviderProps) {
  return <MapContext.Provider value={{ initGoogleMaps }}>{children}</MapContext.Provider>;
}

export function useMapInit(): InitMapsFn {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapInit must be used within a MapProvider");
  }
  return context.initGoogleMaps;
}
