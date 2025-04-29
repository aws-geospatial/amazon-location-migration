## Supported Google APIs - Directions

### [DirectionsService class](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsService)

| [Methods](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsService-Methods) | Supported          | Notes                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------- |
| [route](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsService.route)     | :white_check_mark: | `DirectionsRequest` limitations noted [below](#directionsrequest-interface) |

### [DirectionsRequest interface](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest)

| [Properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest-Properties)                             | Supported          | Notes                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------- |
| [destination](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.destination)                           | :white_check_mark: |                                       |
| [origin](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.origin)                                     | :white_check_mark: |                                       |
| [travelMode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.travelMode)                             | :white_check_mark: | Only supports `DRIVING` and `WALKING` |
| [avoidFerries](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.avoidFerries)                         | :white_check_mark: |                                       |
| [avoidHighways](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.avoidHighways)                       | :white_check_mark: |                                       |
| [avoidTolls](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.avoidTolls)                             | :white_check_mark: |                                       |
| [drivingOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.drivingOptions)                     | :white_check_mark: |                                       |
| [language](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.language)                                 | :x:                |                                       |
| [optimizeWaypoints](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.optimizeWaypoints)               | :x:                |                                       |
| [provideRouteAlternatives](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.provideRouteAlternatives) | :x:                |                                       |
| [region](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.region)                                     | :x:                |                                       |
| [transitOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.transitOptions)                     | :x:                |                                       |
| [unitSystem](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.unitSystem)                             | :white_check_mark: |                                       |
| [waypoints](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/directions#DirectionsRequest.waypoints)                               | :white_check_mark: |                                       |

### [DirectionsResult interface](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult-Properties)                         | Supported          | Notes                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| [request](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult.request)                               | :white_check_mark: |                                                                         |
| [routes](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult.routes)                                 | :white_check_mark: | `DirectionsRoute` limitations noted [below](#directionsroute-interface) |
| [available_travel_modes](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult.available_travel_modes) | :x:                |                                                                         |
| [geocoded_waypoints](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsResult.geocoded_waypoints)         | :x:                |                                                                         |

### [DirectionsRoute interface](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute-Properties)               | Supported          | Notes                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| [bounds](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.bounds)                       | :white_check_mark: |                                                                     |
| [copyrights](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.copyrights)               | :x:                |                                                                     |
| [legs](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.legs)                           | :white_check_mark: | `DirectionsLeg` limitations noted [below](#directionsleg-interface) |
| [overview_path](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.overview_path)         | :x:                |                                                                     |
| [overview_polyline](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.overview_polyline) | :x:                |                                                                     |
| [summary](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.summary)                     | :x:                |                                                                     |
| [warnings](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.warnings)                   | :x:                |                                                                     |
| [waypoint_order](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.waypoint_order)       | :x:                |                                                                     |
| [fare](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsRoute.fare)                           | :x:                |                                                                     |

### [DirectionsLeg interface](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg-Properties)                   | Supported          | Notes                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| [end_address](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.end_address)                 | :white_check_mark: |                                                                       |
| [end_location](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.end_location)               | :white_check_mark: |                                                                       |
| [start_address](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.start_address)             | :white_check_mark: |                                                                       |
| [start_location](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.start_location)           | :white_check_mark: |                                                                       |
| [steps](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.steps)                             | :white_check_mark: | `DirectionsStep` limitations noted [below](#directionsstep-interface) |
| [via_waypoints](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.via_waypoints)             | :x:                |                                                                       |
| [arrival_time](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.arrival_time)               | :x:                |                                                                       |
| [departure_time](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.departure_time)           | :x:                |                                                                       |
| [distance](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.distance)                       | :white_check_mark: |                                                                       |
| [duration](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.duration)                       | :white_check_mark: |                                                                       |
| [duration_in_traffic](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsLeg.duration_in_traffic) | :x:                |                                                                       |

### [DirectionsStep interface](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep-Properties)             | Supported          | Notes                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| [encoded_lat_lngs](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.encoded_lat_lngs) | :x:                |                                                                                                   |
| [end_location](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.end_location)         | :white_check_mark: |                                                                                                   |
| [end_point](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.end_point)               | :white_check_mark: |                                                                                                   |
| [instructions](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.instructions)         | :x:                |                                                                                                   |
| [lat_lngs](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.lat_lngs)                 | :x:                |                                                                                                   |
| [maneuver](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.maneuver)                 | :x:                |                                                                                                   |
| [path](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.path)                         | :x:                |                                                                                                   |
| [start_location](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.start_location)     | :white_check_mark: |                                                                                                   |
| [start_point](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.start_point)           | :white_check_mark: |                                                                                                   |
| [travel_mode](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.travel_mode)           | :white_check_mark: |                                                                                                   |
| [distance](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.distance)                 | :white_check_mark: |                                                                                                   |
| [duration](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.duration)                 | :white_check_mark: |                                                                                                   |
| [polyline](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.polyline)                 | :x:                |                                                                                                   |
| [steps](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.steps)                       | :x:                | These are specified for non-transit sections of transit routes, which aren't currently supported. |
| [transit](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.transit)                   | :x:                |                                                                                                   |
| [transit_details](https://developers.google.com/maps/documentation/javascript/reference/directions#DirectionsStep.transit_details)   | :x:                |                                                                                                   |

### [DistanceMatrixService class](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixService)

| [Methods](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixService-Methods)                     | Supported          | Notes                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| [getDistanceMatrix](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixService.getDistanceMatrix) | :white_check_mark: | `DistanceMatrixRequest` limitations noted [below](#distancematrixrequest-interface) |

### [DistanceMatrixRequest interface](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest)

| [Properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest-Properties)         | Supported          | Notes                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------- |
| [destinations](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.destinations)     | :white_check_mark: |                                       |
| [origins](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.origins)               | :white_check_mark: |                                       |
| [travelMode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.travelMode)         | :white_check_mark: | Only supports `DRIVING` and `WALKING` |
| [avoidFerries](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.avoidFerries)     | :white_check_mark: |                                       |
| [avoidHighways](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.avoidHighways)   | :white_check_mark: |                                       |
| [avoidTolls](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.avoidTolls)         | :white_check_mark: |                                       |
| [drivingOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.drivingOptions) | :white_check_mark: |                                       |
| [language](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.language)             | :x:                |                                       |
| [region](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.region)                 | :x:                |                                       |
| [transitOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.transitOptions) | :x:                |                                       |
| [unitSystem](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.unitSystem)         | :white_check_mark: |                                       |

### [DistanceMatrixResponse interface](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponse)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponse-Properties)                               | Supported          | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| [destinationAddresses](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponse.destinationAddresses)           | :x:                |       |
| [originAddresses](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixRequest.originAddresses) | :x:                |       |
| [rows](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponse.rows)                                           | :white_check_mark: |       |

### [DistanceMatrixResponseRow interface](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseRow)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseRow-Properties) | Supported          | Notes                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| [elements](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseRow.elements)     | :white_check_mark: | `DistanceMatrixResponseElement` limitations noted [below](#distancematrixresponseelement-interface) |

### [DistanceMatrixResponseElement interface](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement-Properties)                   | Supported          | Notes |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| [distance](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement.distance)                       | :white_check_mark: |       |
| [duration](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement.duration)                       | :white_check_mark: |       |
| [duration_in_traffic](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement.duration_in_traffic) | :x:                |       |
| [fare](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement.fare)                               | :x:                |       |
| [status](https://developers.google.com/maps/documentation/javascript/reference/distance-matrix#DistanceMatrixResponseElement.status)                           | :white_check_mark: |       |
