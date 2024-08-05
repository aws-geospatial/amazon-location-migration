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
