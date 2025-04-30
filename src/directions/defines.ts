// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export enum UnitSystem {
  IMPERIAL = 0.0,
  METRIC = 1.0,
}

export enum TravelMode {
  DRIVING = "DRIVING",
  WALKING = "WALKING",
  BICYCLING = "BICYCLING",
  TRANSIT = "TRANSIT",
}

export enum DistanceMatrixStatus {
  INVALID_REQUEST = "INVALID_REQUEST",
  MAX_DIMENSIONS_EXCEEDED = "MAX_DIMENSIONS_EXCEEDED",
  MAX_ELEMENTS_EXCEEDED = "MAX_ELEMENTS_EXCEEDED",
  OK = "OK",
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
  REQUEST_DENIED = "REQUEST_DENIED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum DistanceMatrixElementStatus {
  OK = "OK",
  ZERO_RESULTS = "ZERO_RESULTS",
  NOT_FOUND = "NOT_FOUND",
}
