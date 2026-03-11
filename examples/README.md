# Amazon Location Migration SDK - Examples

This directory contains interactive examples demonstrating how to use the Amazon Location Migration SDK to seamlessly transition from Google Maps to Amazon Location Service.

## 🚀 Quick Start

**View the examples**: Open `landing/index.html` in your browser.

## 📁 Structure

- **`landing/`** - Beautiful landing page showcasing all examples
- **`vanilla/`** - Pure JavaScript examples (no frameworks)
- **`react/`** - React application examples
- **`shared/`** - Shared styles, images, and utilities

## 🎨 Design System

A comprehensive design system is available in `shared/styles/`:

- `variables.css` - Design tokens (colors, spacing, typography)
- `base.css` - Base styles and resets
  `components.css` - Reusable components (buttons, cards, badges)

AWS/Amazon branding colors:

- Primary: `#FF9900` (AWS Orange)
- Secondary: `#232F3E` (AWS Navy)
- Accent: `#0073BB` (AWS Blue)

## 🛠️ Development

### Generating Examples from Templates

Templates use Mustache for variable replacement (e.g., API keys):

```bash
# Edit your config
cp config.template.json config.json
# Edit config.json with your values

# Generate all examples
node generate.js
```

### Adding a New Vanilla Example

1. Create a folder in `vanilla/your-example/`
2. Add three files:

   - `example.js` - Your shared logic (works with both Google & Amazon)
   - `google.template.html` - Google Maps version
   - `index.template.html` - Amazon Location version

3. Use placeholders in templates: `{{GOOGLE_API_KEY}}`, `{{AMAZON_API_KEY}}`, etc.

4. Update `landing/index.html` to add your example card

5. Run `node generate.js` to create final HTML files

### Adding a React Example

Each React example should be a self-contained application with:

- Its own `package.json` with dependencies
- A build process that outputs to a `dist/` or `build/` folder
- A README explaining the example and how to run it
- Both Amazon Location and Google Maps configurations

**Steps to add a new React example:**

1. Create a new folder with your example name (e.g., `react/my-react-app/`)
2. Set up your React app structure:
   ```
   my-react-app/
   ├── package.json
   ├── README.md
   ├── src/
   │   ├── index.js
   │   ├── App.js
   │   └── ...
   ├── public/
   └── dist/ (or build/)
   ```
3. Implement your app with the Migration SDK
4. Add build scripts to generate both Amazon and Google versions if needed
5. Update the landing page (`landing/index.html`) to include your example

**Best practices:**

- Keep examples focused on specific use cases
- Include comprehensive comments
- Provide both Amazon Location and Google Maps versions
- Document any environment variables or config needed
- Use modern React patterns (hooks, functional components)

## 📚 Current Examples

### Vanilla JavaScript

- **Basic Map** - Simple map initialization
- **Markers** - Custom markers with icons
- **Autocomplete** - Place search with suggestions
- **Nearby Search** - Proximity-based place search
- **Directions** - Route calculation with turn-by-turn
- **Optimize Waypoints** - Multi-stop route optimization
- **New Places API** - Latest Google Places API
- **New Places Nearby** - Nearby search with new API
- **NPM Loader** - Integration with build tools
- **Advanced** - Comprehensive full-featured example

### React

_Coming soon! Add your React examples here._

## 🎯 Example Pattern

Each vanilla example follows this pattern:

```
example-name/
├── example.js              # Shared logic (unchanged for both)
├── google.template.html    # Google Maps version
├── index.template.html     # Amazon Location version
├── google.html            # Generated from template
└── index.html             # Generated from template
```

The key insight: **`example.js` remains identical for both Google and Amazon!**

## 🔗 Useful Links

- [GitHub Repository](https://github.com/aws-geospatial/amazon-location-migration)
- [API Reference](https://github.com/aws-geospatial/amazon-location-migration/blob/main/API.md)
