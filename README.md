# TerraView: MapLibre Edition

A high-performance, no-build 3D planetary viewer using MapLibre GL JS.

## Features
- **Globe Projection**: Realistic outer-space view of Earth.
- **NASA Blue Marble**: High-resolution satellite imagery for global scales.
- **OpenFreeMap Integration**: Seamless transition to detailed street maps.
- **3D Terrain**: Real-world elevation data from AWS Terrain Tiles.
- **3D Buildings**: Vector-based building extrusions at street level.
- **Orbital Spin**: Idle rotation when in space view.
- **City Presets**: One-click flight to major global hubs.

## How to Run
1. This is a static web application.
2. Open `index.html` in any modern web browser.
3. No build step or dependencies required (uses CDNs).

## Data Sources
- **Map Engine**: [MapLibre GL JS](https://maplibre.org/)
- **Satellite Imagery**: [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs)
- **Street Maps**: [OpenFreeMap](https://openfreemap.org/) / OpenStreetMap
- **Terrain**: AWS Terrain Tiles (via MapLibre Demo)
