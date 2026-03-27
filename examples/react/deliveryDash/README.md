# 🚚 Delivery Dash - React Migration Example

An interactive routing game that demonstrates comprehensive Google Maps API integration in a React application. Players race against an algorithm's optimal route to test their routing skills!

## 🎮 What is Delivery Dash?

Delivery Dash is a gamified routing application where users:

1. **Choose a character** - Select from 4 delivery characters (🍕 🚴 🛵 🚗)
2. **Select waypoints** - Find restaurants, cafes, stores, or custom locations
3. **Build a route** - Click waypoints in your preferred order
4. **Race the robot** - Watch your route compete against the algorithm's optimized route
5. **Compare results** - See if your intuition beats the optimizer!

This example showcases real-world Google Maps API usage patterns in a production-quality React application.

---

## 🎯 How to Play

### Quick Start Mode (Recommended)
- Automatically finds 6 nearby restaurants
- Fast setup - just click waypoints and go!
- Perfect for quick testing

### Custom Mode (Full Control)
- Search for any location with autocomplete
- Use "Find Nearby" buttons (restaurants, cafes, stores, gas stations, parks, ATMs)
- Add up to 10 custom waypoints
- Build complex custom routes

### Gameplay
1. Click waypoints on the map in the order you want to visit them
2. Your route appears as a colored line
3. Click "🏁 Start Race!" when ready (minimum 2 waypoints)
4. Watch both characters race along their routes simultaneously
5. View results showing efficiency, distance, and time comparison

---

## 🗺️ Google Maps APIs Demonstrated

This example provides comprehensive coverage of Google Maps Platform features:

### 1. Maps JavaScript API
- **Map initialization** with custom controls (zoom, map type, fullscreen)
- **Custom markers** with dynamic SVG icons (data URLs)
- **Icon updates** - change size, color, and content dynamically
- **Click event handling** on markers
- **Z-index management** for marker layering
- **Polylines** for route visualization with custom colors and opacity
- **Multiple polylines** drawn simultaneously

### 2. Places API

#### Autocomplete
- Text input with real-time location suggestions
- Field selection (name, address, geometry, place_id)
- Place selection and coordinate extraction

#### Nearby Search
- Find places within configurable radius (2km default)
- Multiple place type filters: `restaurant`, `cafe`, `store`, `gas_station`, `park`, `atm`
- Returns: name, coordinates, vicinity, place_id, types
- Used in both Quick Start (automatic) and Custom Mode (on-demand)

### 3. Directions API

#### Multi-Waypoint Routing
- Routes with 2-10 waypoints
- Origin and destination points
- Intermediate waypoints with `stopover: true`
- Returns: distance, duration, overview_path, route legs

#### Waypoint Optimization ⭐
This is the **star feature** of the example! Makes two identical requests:

1. **User Route** - `optimizeWaypoints: false`
   - Preserves user's selected order
   - Shows "human intuition" routing

2. **Optimal Route** - `optimizeWaypoints: true`
   - Google optimizes waypoint order for shortest route
   - Returns optimized order in `waypoint_order` array
   - Shows algorithm's "best solution"

The race compares these two approaches visually and quantitatively.

### 4. Geometry Library
- `computeDistanceBetween()` for path segment distances
- Path interpolation for smooth marker animation
- Position calculation along routes for real-time racing

---

## 📊 API Usage Patterns

### Per Game Session

**Quick Start Mode:**
- 1× Nearby Search (restaurants)
- 2× Directions API (user route + optimal route)
- **Total: 3 API calls**

**Custom Mode:**
- N× Autocomplete queries (as user types)
- M× Nearby Search (when using "Find Nearby")
- 2× Directions API (user route + optimal route)
- **Total: N + M + 2 API calls**

### Key Features Tested

✅ **Well-Supported Features:**
- Map rendering with custom controls
- Custom marker icons (SVG data URLs)
- Polyline visualization
- Multi-waypoint routing
- Place search (nearby and autocomplete)
- Basic place information
- Distance and duration calculations

⭐ **Advanced Features:**
- **Waypoint optimization** (`optimizeWaypoints: true`)
- Simultaneous route comparison
- Real-time marker animation
- Complex state management
- Dynamic icon generation

---

## 🎓 Migration Testing Value

### Why This Example?

1. **Production-Quality Patterns** - Uses APIs exactly how real applications do
2. **Comprehensive Coverage** - Tests all major Google Maps features in one cohesive flow
3. **Clear Success Criteria** - Visual and quantitative validation that migration worked
4. **Engaging Test Case** - Fun to use repeatedly during development and testing
5. **Complex State** - Tests React integration with maps, markers, routes, and animations

### What To Test During Migration

**Critical Features:**
- [ ] Map renders with controls
- [ ] Custom markers display correctly (SVG data URLs)
- [ ] Marker click events work
- [ ] Polylines draw with correct colors and opacity
- [ ] Multiple polylines visible simultaneously
- [ ] Nearby search finds places within radius
- [ ] Type filtering works (restaurant, cafe, etc.)
- [ ] Autocomplete shows location suggestions
- [ ] Place selection returns valid coordinates
- [ ] Multi-waypoint routing calculates (2-10 stops)
- [ ] Distance and duration are accurate
- [ ] Routes display on map

**Advanced Features:**
- [ ] **Waypoint optimization** - Does migration support `optimizeWaypoints`?
- [ ] Waypoint order array returned correctly
- [ ] Path interpolation for animation works
- [ ] Marker animation is smooth

---

## 🛠️ Technology Stack

- **React 18** with TypeScript
- **Vite** for build and dev server
- **Google Maps Platform** (Maps JavaScript API, Places API, Directions API, Geometry Library)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ModeSelection.tsx       # Character and mode selection
│   ├── GameBoard.tsx           # Route building interface
│   ├── GameMap.tsx             # Map with waypoint markers
│   ├── WaypointSearch.tsx      # Search and nearby places UI
│   ├── RaceView.tsx            # Animated racing screen
│   └── ResultsView.tsx         # Results comparison
├── types.ts                    # TypeScript type definitions
├── gameData.ts                 # Game configuration and helpers
├── mapUtils.ts                 # Google Maps utilities
├── App.tsx                     # Main application component
├── App.css                     # Styling
└── main.tsx                    # Entry point
```

---

## 🚀 Running the Example

See the main examples README for setup instructions. This example requires:

- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Places API
  - Directions API

---

**Ready to test your routing skills?** Fire up the app and see if you can beat the robot! 🏁
