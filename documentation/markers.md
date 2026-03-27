## Supported Google APIs - Markers

### [AdvancedMarkerElement class](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement)

| [Methods](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement-Methods) | Supported          | Notes                                             |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------- |
| addListener                                                                                                                     | :white_check_mark: |                                                   |
| constructor                                                                                                                     | :white_check_mark: | Partial support via `MigrationMarker` constructor |

| [Events](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement-Events) | Supported          | Notes |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| click                                                                                                                         | :white_check_mark: |       |
| drag                                                                                                                          | :white_check_mark: |       |
| dragend                                                                                                                       | :white_check_mark: |       |
| dragstart                                                                                                                     | :white_check_mark: |       |

### [AdvancedMarkerElementOptions interface](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions-Properties) | Supported          | Notes                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| content                                                                                                                                      | :white_check_mark: | Does not support any customization that uses the PinElement class |
| gmpDraggable                                                                                                                                 | :white_check_mark: |                                                                   |
| map                                                                                                                                          | :white_check_mark: |                                                                   |
| position                                                                                                                                     | :white_check_mark: | Does not support altitude for markers                             |
| title                                                                                                                                        | :white_check_mark: |                                                                   |

### [Marker class](https://developers.google.com/maps/documentation/javascript/reference/marker)

| [Methods](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker-Methods) | Supported          | Notes                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| getAnimation                                                                                           | :x:                | Method exists but logs error and returns undefined                                     |
| getClickable                                                                                           | :white_check_mark: |                                                                                        |
| getCursor                                                                                              | :white_check_mark: |                                                                                        |
| getDraggable                                                                                           | :white_check_mark: |                                                                                        |
| getIcon                                                                                                | :white_check_mark: | If the source is an Icon object containing a URL, this method will only return the URL |
| getLabel                                                                                               | :white_check_mark: | Returns stored label value; full DOM rendering not currently implemented               |
| getMap                                                                                                 | :white_check_mark: |                                                                                        |
| getOpacity                                                                                             | :white_check_mark: |                                                                                        |
| getPosition                                                                                            | :white_check_mark: |                                                                                        |
| getShape                                                                                               | :x:                | Method exists but logs error and returns undefined                                     |
| getTitle                                                                                               | :white_check_mark: |                                                                                        |
| getVisible                                                                                             | :white_check_mark: |                                                                                        |
| getZIndex                                                                                              | :white_check_mark: |                                                                                        |
| setAnimation                                                                                           | :x:                | Method exists but logs error (no MapLibre equivalent for BOUNCE/DROP animations)       |
| setClickable                                                                                           | :white_check_mark: |                                                                                        |
| setCursor                                                                                              | :white_check_mark: |                                                                                        |
| setDraggable                                                                                           | :white_check_mark: |                                                                                        |
| setIcon                                                                                                | :white_check_mark: | Supports string URL, Icon with url/scaledSize/anchor, and Symbol with path             |
| setLabel                                                                                               | :white_check_mark: | Stores label value; full DOM rendering not currently implemented                       |
| setMap                                                                                                 | :white_check_mark: |                                                                                        |
| setOpacity                                                                                             | :white_check_mark: |                                                                                        |
| setOptions                                                                                             | :white_check_mark: | Can handle setting the draggable, map, opacity, position, and visible options          |
| setPosition                                                                                            | :white_check_mark: |                                                                                        |
| setShape                                                                                               | :x:                | Method exists but logs error (no MapLibre equivalent for marker shapes/click regions)  |
| setTitle                                                                                               | :white_check_mark: |                                                                                        |
| setVisible                                                                                             | :white_check_mark: |                                                                                        |
| setZIndex                                                                                              | :white_check_mark: |                                                                                        |

| [Events](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker-Events) | Supported          | Notes |
| ---------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| click                                                                                                | :white_check_mark: |       |
| contextmenu                                                                                          | :white_check_mark: |       |
| dblclick                                                                                             | :white_check_mark: |       |
| drag                                                                                                 | :white_check_mark: |       |
| dragend                                                                                              | :white_check_mark: |       |
| dragstart                                                                                            | :white_check_mark: |       |
| mousedown                                                                                            | :x:                |       |
| mouseout                                                                                             | :x:                |       |
| mouseover                                                                                            | :x:                |       |
| mouseup                                                                                              | :x:                |       |

### [MarkerOptions interface](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions-Properties) | Supported          | Notes |
| ------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| anchorPoint                                                                                                         | :x:                |       |
| animation                                                                                                           | :x:                |       |
| clickable                                                                                                           | :white_check_mark: |       |
| collisionBehavior                                                                                                   | :x:                |       |
| crossOnDrag                                                                                                         | :x:                |       |
| cursor                                                                                                              | :white_check_mark: |       |
| draggable                                                                                                           | :white_check_mark: |       |
| icon                                                                                                                | :white_check_mark: |       |
| label                                                                                                               | :white_check_mark: |       |
| map                                                                                                                 | :white_check_mark: |       |
| opacity                                                                                                             | :white_check_mark: |       |
| optimized                                                                                                           | :x:                |       |
| position                                                                                                            | :white_check_mark: |       |
| shape                                                                                                               | :x:                |       |
| title                                                                                                               | :white_check_mark: |       |
| visible                                                                                                             | :white_check_mark: |       |
| zIndex                                                                                                              | :white_check_mark: |       |

### [Icon interface](https://developers.google.com/maps/documentation/javascript/reference/marker#Icon)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/marker#Icon-Properties) | Supported          | Notes |
| ---------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| anchor                                                                                                     | :white_check_mark: |       |
| labelOrigin                                                                                                | :x:                |       |
| origin                                                                                                     | :x:                |       |
| scaledSize                                                                                                 | :white_check_mark: |       |
| size                                                                                                       | :x:                |       |
| url                                                                                                        | :white_check_mark: |       |

### [Symbol interface](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol-Properties) | Supported          | Notes |
| ------------------------------------------------------------------------------------------------------------ | ------------------ | ----- |
| anchor                                                                                                       | :x:                |       |
| fillColor                                                                                                    | :white_check_mark: |       |
| fillOpacity                                                                                                  | :white_check_mark: |       |
| labelOrigin                                                                                                  | :x:                |       |
| path                                                                                                         | :white_check_mark: |       |
| rotation                                                                                                     | :white_check_mark: |       |
| scale                                                                                                        | :white_check_mark: |       |
| strokeColor                                                                                                  | :white_check_mark: |       |
| strokeOpacity                                                                                                | :white_check_mark: |       |
| strokeWeight                                                                                                 | :white_check_mark: |       |

### [MarkerLabel interface](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel)

| [Properties](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel-Properties) | Supported          | Notes |
| ----------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| className                                                                                                         | :white_check_mark: |       |
| color                                                                                                             | :white_check_mark: |       |
| fontFamily                                                                                                        | :white_check_mark: |       |
| fontSize                                                                                                          | :white_check_mark: |       |
| fontWeight                                                                                                        | :white_check_mark: |       |
| text                                                                                                              | :white_check_mark: |       |
