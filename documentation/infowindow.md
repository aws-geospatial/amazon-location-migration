## Supported Google API's
### [InfoWindow class](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow)

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow" style="text-decoration:none;">Methods</a>  | Description | Notes |
| --- | --- | --- |
| [close](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.close) | Closes this InfoWindow by removing it from the DOM structure.||
| [focus](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.focus) | Sets focus on this InfoWindow.||
| [getContent](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.getContent) |The content of this InfoWindow.|Google Location Services will return the same as what was previously set as the content (string or [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element) or [Text](https://developer.mozilla.org/en-US/docs/Web/API/Text)). Amazon Location Services will return the HTMLElement behind the InfoWindow object.|
| [getPosition](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.getPosition) |The LatLng position of this InfoWindow.||
| [open](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.open) |Opens this InfoWindow on the given map.|[StreetViewPanorama](https://developers.google.com/maps/documentation/javascript/reference/street-view#StreetViewPanorama) option is not supported by Amazon Location Services.|
| [setContent](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.setContent) |The content to be displayed by this InfoWindow.||
| [setOptions](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.setOptions) |Sets the InfoWindowOptions of the InfoWindow.|Amazon Location Services supports minWidth, maxWidth, ariaLabel, content, and position InfoWindowOptions.|
| [setPosition](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.setPosition) |The LatLng position at which to display this InfoWindow.||
| [addListener](https://developers.google.com/maps/documentation/javascript/reference/event#MVCObject.addListener) | Adds the given listener function to the given event name. ||

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/map#Map-Events" style="text-decoration:none;">Events</a>  | Description | Notes |
| --- | --- | --- |
| [close](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.close$event) |This event is fired whenever the InfoWindow closes.||
| [closeClick](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.closeclick)|This event is fired when the close button was clicked.||

### [InfoWindowOptions interface](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions)

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[ariaLabel](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions.ariaLabel)|AriaLabel to assign to the InfoWindow.||
| [content](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions.content)|Content to display in the InfoWindow.||
| [maxWidth](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions.maxWidth)|Maximum width of the InfoWindow, regardless of content's width.||
|[minWidth](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions.minWidth)|Minimum width of the InfoWindow, regardless of the content's width.||
|[position](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions.position)|The LatLng at which to display this InfoWindow. If the InfoWindow is opened with an anchor, the anchor's position will be used instead.||

### [InfoWindowOpenOptions interface](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOpenOptions)

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOpenOptions-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[anchor](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOpenOptions.anchor)|The anchor to which this InfoWindow will be positioned.||
| [map](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOpenOptions.map)|The map on which to render this InfoWindow.|[StreetViewPanorama](https://developers.google.com/maps/documentation/javascript/reference/street-view#StreetViewPanorama) option is not supported by Amazon Location Services.|
| [shouldFocus](https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOpenOptions.shouldFocus)|Whether or not focus should be moved inside the InfoWindow when it is opened.||


