## Supported Google API's
### [AdvancedMarkerElement class](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement-Methods" style="text-decoration:none;">Methods</a>  | Description | Notes |
| --- | --- | --- |
| [addListener](https://developers.google.com/maps/documentation/javascript/reference/event#MVCObject.addListener)|Adds the given listener function to the given event name. ||

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/map#Map-Events" style="text-decoration:none;">Events</a> | Description | Notes |
| --- | --- | --- |
| [click](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.click)|This event is fired when the AdvancedMarkerElement element is clicked. ||
| [drag](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.drag)|This event is repeatedly fired while the user drags the AdvancedMarkerElement.||
| [dragend](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.dragend) |This event is fired when the user stops dragging the AdvancedMarkerElement.||
| [dragstart](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.dragstart) |This event is fired when the user starts dragging the AdvancedMarkerElement.||

### [AdvancedMarkerElementOptions interface](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[content](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions.content)|The DOM Element backing the visual of an AdvancedMarkerElement.|Amazon Location Services does not support any customization that uses the PinElement class.|
|[gmpDraggable](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions.gmpDraggable)|If `true`, the AdvancedMarkerElement can be dragged.||
|[map](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions.map)|Map on which to display the AdvancedMarkerElement.||
|[position](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions.position)|Sets the AdvancedMarkerElement's position.|Amazon Location Services does not support altitude for markers.|

### [Marker class](https://developers.google.com/maps/documentation/javascript/reference/marker)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/marker#Marker-Methods" style="text-decoration:none;">Methods</a>  | Description | Notes |
| --- | --- | --- |
|[getDraggable](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.getDraggable)|Get the draggable status of the Marker.||
|[getIcon](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.getIcon)|Get the icon of the Marker.|If the source of the marker's icon is an Icon object containing a URL, this method will only return the URL.|
|[getOpacity](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.getOpacity)|Get the opacity of the Marker.||
|[getPosition](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.getPosition)|Get the position of the Marker.||
|[getVisible](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.getVisible)|Get the visibility of the Marker.||
|[setDraggable](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setDraggable)|Set if the Marker is draggable.||
|[setMap](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setMap)|Renders the Marker on the specified map or panorama.||
|[setOpacity](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setOpacity)|Set the opacity of the Marker.||
|[setOptions](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setOptions)|Set the options for the Marker.|This method can handle setting the draggable, map, opacity, position, and visible options.|
|[setPosition](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setPosition)|Set the postition for the Marker.||
|[setVisible](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.setVisible)|Set if the Marker is visible.||

|  <a href="https://developers.google.com/maps/documentation/javascript/reference/map#Map-Events" style="text-decoration:none;">Events</a>  | Description | Notes |
| --- | --- | --- |
| [click](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.click)| This event is fired when the Marker icon was clicked. ||
| [contextmenu](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.contextmenu)|This event is fired when the DOM contextmenu event is fired on the Marker.||
| [dblclick](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.dblclick)|This event is fired when the Marker icon was double clicked.||
| [drag](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.drag)|This event is repeatedly fired while the user drags the Marker.||
| [dragend](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.dragend)|This event is fired when the user stops dragging the Marker.||
| [dragstart](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.dragstart)|This event is fired when the user starts dragging the Marker.||
| [mousedown](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.mousedown)|This event is fired for a mousedown on the Marker.||
| [mouseout](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.mouseout)|This event is fired when the mouse leaves the area of the Marker icon.||
| [mouseover](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.mouseover)|This event is fired when the mouse enters the area of the Marker icon.||
| [mouseup](https://developers.google.com/maps/documentation/javascript/reference/marker#Marker.mouseup)|This event is fired for a mouseup on the Marker.||

### [MarkerOptions interface](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[draggable](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.draggable)|If `true`, the marker can be dragged.||
| [icon](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.icon)|Icon for the foreground.||
| [label](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.label)|Adds a label to the marker. A marker label is a letter or number that appears inside a marker.||
|[map](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.map)|Map on which to display Marker.||
|[opacity](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.opacity)|A number between 0.0, transparent, and 1.0, opaque.||
|[position](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.position)|Sets the marker position.||
|[visible](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.visible)|If `true`, the marker is visible.||

### [Icon interface](https://developers.google.com/maps/documentation/javascript/reference/marker#Icon)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/marker#Icon-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[url](https://developers.google.com/maps/documentation/javascript/reference/marker#Icon.url)|The URL of the image or sprite sheet.||

### [Symbol interface](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[path](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol.path)|The symbol's path, which is a built-in symbol path, or a custom path expressed using [SVG path notation](http://www.w3.org/TR/SVG/paths.html#PathData).||
|[rotation](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol.rotation)|The angle by which to rotate the symbol, expressed clockwise in degrees.||
|[scale](https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol.scale)|The amount by which the symbol is scaled in size.||

### [MarkerLabel interface](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel)
|  <a href="https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel-Properties" style="text-decoration:none;">Properties</a>  | Description | Notes |
| --- | --- | --- |
|[text](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.text)|The text to be displayed in the label.||
|[className](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.className)|The className property of the label's element (equivalent to the element's class attribute).||
|[color](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.color)|The color of the label text.||
|[fontFamily](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.fontFamily)|The font family of the label text (equivalent to the CSS font-family property).||
|[fontSize](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.fontSize)|The font size of the label text (equivalent to the CSS font-size property).||
|[fontWeight](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel.fontWeight)|The font weight of the label text (equivalent to the CSS font-weight property).||