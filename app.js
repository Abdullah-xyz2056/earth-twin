// TerraView: Earth Twin Edition
// Enhanced 3D Planetary Engine
// NASA GIBS + OpenFreeMap Vector + MapLibre GL JS

const INITIAL_VIEW = {
    center: [139.767, 35.681], // Tokyo
    zoom: 1.82,
    pitch: 0,
    bearing: 0
};

let map;
let isSpinning = true;
let terrainEnabled = false;
let isNightMode = false;
let cloudsEnabled = true;
let atmosphereEnabled = true;

// NASA GIBS Layer Constants
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const NASA_BASE_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const LAYERS = {
    BLUE_MARBLE: 'BlueMarble_ShadedRelief_Bathymetry',
    CLOUDS: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    NIGHT: 'VIIRS_Black_Marble',
    VECTOR_TILES: 'https://tiles.openfreemap.org/tiles.json'
};

function getNASAUrl(layer, time = 'default', level = 8, format = 'jpg') {
    return `${NASA_BASE_URL}/${layer}/default/${time}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${format}`;
}

// Initialize Map
function initMap() {
    if (typeof maplibregl === 'undefined') return;

    try {
        map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {
                    'nasa-day': {
                        type: 'raster',
                        tiles: [getNASAUrl(LAYERS.BLUE_MARBLE, 'default', 8, 'jpg')],
                        tileSize: 256,
                        maxzoom: 8,
                        attribution: 'NASA GIBS'
                    },
                    'nasa-night': {
                        type: 'raster',
                        tiles: [getNASAUrl(LAYERS.NIGHT, '2016-01-01', 8, 'png')],
                        tileSize: 256,
                        maxzoom: 8,
                        attribution: 'NASA GIBS'
                    },
                    'nasa-clouds': {
                        type: 'raster',
                        tiles: [getNASAUrl(LAYERS.CLOUDS, getYesterdayDate(), 9, 'jpg')],
                        tileSize: 256,
                        maxzoom: 9,
                        attribution: 'NASA GIBS'
                    },
                    'osm-raster': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OSM'
                    },
                    'openmaptiles': {
                        type: 'vector',
                        tiles: ['https://tiles.openfreemap.org/tiles/{z}/{x}/{y}.pbf'],
                        minzoom: 0,
                        maxzoom: 14
                    },
                    'terrain-source': {
                        type: 'raster-dem',
                        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                        tileSize: 256
                    },
                    'hillshade-source': {
                        type: 'raster-dem',
                        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                        tileSize: 256
                    }
                },
                layers: [
                    { id: 'background', type: 'background', paint: { 'background-color': '#000005' } },
                    {
                        id: 'raster-day',
                        type: 'raster',
                        source: 'nasa-day',
                        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 8, 1, 10, 0] }
                    },
                    {
                        id: 'raster-night',
                        type: 'raster',
                        source: 'nasa-night',
                        layout: { visibility: 'none' },
                        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 8, 1, 10, 0] }
                    },
                    {
                        id: 'raster-clouds',
                        type: 'raster',
                        source: 'nasa-clouds',
                        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 8, 0] }
                    },
                    {
                        id: 'background-street',
                        type: 'background',
                        minzoom: 8,
                        paint: { 'background-color': '#f8f9fc' }
                    },
                    {
                        id: 'osm-street',
                        type: 'raster',
                        source: 'osm-raster',
                        minzoom: 8,
                        paint: { 
                            'raster-opacity': [
                                'interpolate', ['linear'], ['zoom'], 
                                8, 0, 
                                9, 1,
                                14, 0.5,
                                16, 0.1
                            ] 
                        }
                    },
                    {
                        id: 'hillshade',
                        type: 'hillshade',
                        source: 'hillshade-source',
                        paint: {
                            'hillshade-exaggeration': 0.5,
                            'hillshade-shadow-color': '#000000',
                            'hillshade-highlight-color': '#ffffff'
                        }
                    },
                    {
                        id: 'water',
                        type: 'fill',
                        source: 'openmaptiles',
                        'source-layer': 'water',
                        minzoom: 8,
                        paint: { 
                            'fill-color': '#003366',
                            'fill-opacity': 0.4
                        }
                    },
                    {
                        id: 'landuse',
                        type: 'fill',
                        source: 'openmaptiles',
                        'source-layer': 'landuse',
                        minzoom: 10,
                        paint: {
                            'fill-color': [
                                'match', ['get', 'class'],
                                'park', '#e8f5e9',
                                'forest', '#c8e6c9',
                                '#f1f3f4'
                            ]
                        }
                    },
                    {
                        id: 'roads',
                        type: 'line',
                        source: 'openmaptiles',
                        'source-layer': 'transportation',
                        minzoom: 12,
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 10],
                            'line-opacity': 0.8
                        }
                    },
                    {
                        id: 'buildings-3d',
                        type: 'fill-extrusion',
                        source: 'openmaptiles',
                        'source-layer': 'building',
                        minzoom: 13,
                        paint: {
                            'fill-extrusion-color': [
                                'interpolate', ['linear'], ['get', 'render_height'],
                                0, '#00f2ff',
                                100, '#00b8d4',
                                500, '#005f6b'
                            ],
                            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 20],
                            'fill-extrusion-opacity': 0.7,
                            'fill-extrusion-vertical-gradient': true
                        }
                    },
                    {
                        id: 'road-labels',
                        type: 'symbol',
                        source: 'openmaptiles',
                        'source-layer': 'transportation_name',
                        minzoom: 13,
                        layout: {
                            'text-field': ['get', 'name'],
                            'text-font': ['Open Sans Regular'],
                            'text-size': 10,
                            'symbol-placement': 'line'
                        },
                        paint: {
                            'text-color': '#444444',
                            'text-halo-color': '#ffffff',
                            'text-halo-width': 1
                        }
                    },
                    {
                        id: 'place-labels',
                        type: 'symbol',
                        source: 'openmaptiles',
                        'source-layer': 'place',
                        minzoom: 5,
                        layout: {
                            'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name'], ''],
                            'text-font': ['Open Sans Regular'],
                            'text-size': ['interpolate', ['linear'], ['zoom'], 5, 8, 12, 14],
                            'text-max-width': 8
                        },
                        paint: {
                            'text-color': '#333333',
                            'text-halo-color': '#ffffff',
                            'text-halo-width': 1.5
                        }
                    },
                    {
                        id: 'poi-labels',
                        type: 'symbol',
                        source: 'openmaptiles',
                        'source-layer': 'poi',
                        minzoom: 15,
                        layout: {
                            'text-field': ['get', 'name'],
                            'text-font': ['Open Sans Regular'],
                            'text-size': 10
                        },
                        paint: {
                            'text-color': '#666666',
                            'text-halo-color': '#ffffff',
                            'text-halo-width': 1
                        }
                    }
                ]
            },
            center: INITIAL_VIEW.center,
            zoom: INITIAL_VIEW.zoom,
            projection: 'globe',
            antialias: true
        });

        map.on('load', () => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 800);
            }

            ['btn-spin', 'btn-clouds', 'btn-atmosphere'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.add('active');
            });

            rotateGlobe();
            setupEvents();
            setupUI();
            updateAtmosphere();
        });

        map.on('error', (e) => {
            if (e.message && (e.message.includes('font') || e.message.includes('glyphs'))) return;
            console.warn('MapEngine:', e.message || 'Syncing...');
        });

        const stopSpin = () => {
            isSpinning = false;
            const btn = document.getElementById('btn-spin');
            if (btn) btn.classList.remove('active');
        };
        map.on('mousedown', stopSpin);
        map.on('touchstart', stopSpin);
        map.on('wheel', stopSpin);

    } catch (err) {
        console.error('Crash:', err);
    }
}

function updateAtmosphere() {
    if (!atmosphereEnabled) { map.setFog(null); return; }
    const fogColor = isNightMode ? '#000005' : '#1E3A8A';
    map.setFog({ 'color': fogColor, 'horizon-blend': isNightMode ? 0.05 : 0.2, 'range': [0.5, 12] });
}

function rotateGlobe() {
    if (!isSpinning) return;
    if (map.getZoom() < 5) {
        const center = map.getCenter();
        center.lng -= 0.04;
        map.setCenter(center);
        requestAnimationFrame(rotateGlobe);
    }
}

function setupEvents() {
    map.on('move', () => {
        const zoom = map.getZoom();
        const zoomEl = document.getElementById('status-zoom');
        if (zoomEl) zoomEl.innerText = zoom.toFixed(2);
        const modeEl = document.getElementById('status-mode');
        if (modeEl) modeEl.innerText = zoom > 10 ? 'Street' : 'Orbital';
    });
}

function setupUI() {
    document.getElementById('btn-orbital').addEventListener('click', () => {
        map.flyTo({ center: [0, 20], zoom: 1.82, pitch: 0, bearing: 0, duration: 3000 });
        isSpinning = true;
        document.getElementById('btn-spin').classList.add('active');
        rotateGlobe();
    });

    document.getElementById('btn-mode').addEventListener('click', (e) => {
        isNightMode = !isNightMode;
        const btn = e.target;
        btn.innerText = isNightMode ? 'Day View' : 'Night View';
        btn.classList.toggle('active', isNightMode);
        map.setLayoutProperty('raster-night', 'visibility', isNightMode ? 'visible' : 'none');
        map.setLayoutProperty('raster-day', 'visibility', isNightMode ? 'none' : 'visible');
        map.setLayoutProperty('raster-clouds', 'visibility', (!isNightMode && cloudsEnabled) ? 'visible' : 'none');
        updateAtmosphere();
    });

    document.getElementById('btn-terrain').addEventListener('click', (e) => {
        terrainEnabled = !terrainEnabled;
        e.target.classList.toggle('active', terrainEnabled);
        document.getElementById('status-terrain').innerText = terrainEnabled ? 'On' : 'Off';
        terrainEnabled ? map.setTerrain({ source: 'terrain-source', exaggeration: 1.5 }) : map.setTerrain(null);
    });

    document.getElementById('btn-spin').addEventListener('click', (e) => {
        isSpinning = !isSpinning;
        e.target.classList.toggle('active', isSpinning);
        if (isSpinning) rotateGlobe();
    });

    document.getElementById('btn-clouds').addEventListener('click', (e) => {
        cloudsEnabled = !cloudsEnabled;
        e.target.classList.toggle('active', cloudsEnabled);
        map.setLayoutProperty('raster-clouds', 'visibility', cloudsEnabled ? 'visible' : 'none');
    });

    document.getElementById('btn-atmosphere').addEventListener('click', (e) => {
        atmosphereEnabled = !atmosphereEnabled;
        e.target.classList.toggle('active', atmosphereEnabled);
        updateAtmosphere();
    });

    document.getElementById('btn-locate').addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15.8, pitch: 60, duration: 4000, essential: true });
            isSpinning = false;
            document.getElementById('btn-spin').classList.remove('active');
        });
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const { lat, lon, zoom } = btn.dataset;
            map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: parseFloat(zoom), pitch: 65, bearing: -20, duration: 5000, essential: true });
            isSpinning = false;
            document.getElementById('btn-spin').classList.remove('active');
        });
    });
}

initMap();
