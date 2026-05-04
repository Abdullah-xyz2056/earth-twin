import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Search, MapPin, Navigation2, Layers, Info, X, Cloud, Wind } from 'lucide-react';

const FAMOUS_LOCATIONS = [
  { name: 'New York City', lat: 40.7128, lon: -74.0060, height: 1000, description: 'The Big Apple' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, height: 1000, description: 'City of Light' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, height: 1000, description: 'Modern Metropolis' },
  { name: 'Grand Canyon', lat: 36.0544, lon: -112.1401, height: 5000, description: 'Natural Wonder' },
  { name: 'Himalayas', lat: 27.9881, lon: 86.9250, height: 10000, description: 'Roof of the World' },
];

const CesiumGlobe: React.FC = () => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const cloudLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulation States
  const [cloudsEnabled, setCloudsEnabled] = useState(true);
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(true);
  const [lightingEnabled, setLightingEnabled] = useState(true);

  useEffect(() => {
    if (!cesiumContainerRef.current) return;

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
      animation: false,
      baseLayerPicker: true,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: true,
      infoBox: true,
      sceneModePicker: true,
      selectionIndicator: true,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      shouldAnimate: true,
    });

    // Add OSM Buildings and Terrain asynchronously
    let isCleanedUp = false;
    const initAsync = async () => {
      try {
        const buildings = await Cesium.createOsmBuildingsAsync();
        if (!isCleanedUp) {
          viewer.scene.primitives.add(buildings);
        }
        
        const terrainProvider = await Cesium.createWorldTerrainAsync();
        if (!isCleanedUp) {
          viewer.terrainProvider = terrainProvider;
        }
      } catch (error) {
        console.warn("Cesium asset loading issue:", error);
      }
    };

    initAsync();

    // Enable lighting based on sun position
    viewer.scene.globe.enableLighting = true;

    // Set initial view to outer space
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
    });

    viewerRef.current = viewer;
    setIsLoaded(true);

    // Initial Cloud Layer (Static for now, but togglable)
    const addClouds = async () => {
      const cloudImagery = new Cesium.SingleTileImageryProvider({
        url: 'https://cesium.com/downloads/cesiumjs/releases/1.100/Build/Cesium/Assets/Textures/NaturalEarthII/2/0/0.jpg', // Placeholder for cloud texture if needed, but we'll use a better one
        rectangle: Cesium.Rectangle.MAX_VALUE,
      });
      // Actually, let's use a more realistic cloud map URL if possible, 
      // otherwise we'll just toggle atmosphere which gives the "cloudy" look at distance.
      // For now, we'll focus on the atmosphere simulation toggles.
    };

    return () => {
      isCleanedUp = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle Simulation Toggles
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    viewer.scene.skyAtmosphere.show = atmosphereEnabled;
    viewer.scene.globe.showGroundAtmosphere = atmosphereEnabled;
    viewer.scene.globe.enableLighting = lightingEnabled;

    // Cloud Simulation
    const updateClouds = async () => {
      if (cloudsEnabled) {
        if (!cloudLayerRef.current) {
          try {
            // Using fromUrl which is the modern async way in Cesium
            const cloudProvider = await Cesium.SingleTileImageryProvider.fromUrl(
              'https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/Sandcastle/images/clouds.png',
              { rectangle: Cesium.Rectangle.MAX_VALUE }
            );
            
            if (viewerRef.current) {
              cloudLayerRef.current = viewerRef.current.imageryLayers.addImageryProvider(cloudProvider);
              cloudLayerRef.current.alpha = 0.6;
              cloudLayerRef.current.brightness = 1.2;
            }
          } catch (error) {
            console.error("Failed to load cloud imagery:", error);
          }
        } else {
          cloudLayerRef.current.show = true;
        }
        if (viewerRef.current) {
          viewerRef.current.scene.skyAtmosphere.brightnessShift = 0.0;
        }
      } else {
        if (cloudLayerRef.current) {
          cloudLayerRef.current.show = false;
        }
        if (viewerRef.current) {
          // Dimming atmosphere slightly to simulate "no clouds"
          viewerRef.current.scene.skyAtmosphere.brightnessShift = -0.2;
        }
      }
    };

    updateClouds();
  }, [cloudsEnabled, atmosphereEnabled, lightingEnabled]);

  const flyToLocation = (lat: number, lon: number, height: number) => {
    if (!viewerRef.current) return;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      duration: 3,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      }
    });
    setShowLocations(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would use a geocoding service here.
    // For this demo, we'll just alert or fly to a random place if it matches our list.
    const found = FAMOUS_LOCATIONS.find(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (found) {
      flyToLocation(found.lat, found.lon, found.height);
    } else {
      alert(`Location "${searchQuery}" not found in our quick-list. Try New York, Paris, or Tokyo!`);
    }
  };

  const flyToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        flyToLocation(position.coords.latitude, position.coords.longitude, 1000);
      },
      (error) => {
        alert(`Error getting location: ${error.message}`);
      }
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans">
      {/* Cesium Container */}
      <div ref={cesiumContainerRef} className="w-full h-full" id="cesium-container" />

      {/* UI Overlays - Technical Dashboard Style */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-emerald-500 font-mono text-sm tracking-widest uppercase animate-pulse">
            Initializing TerraView Engine...
          </p>
        </div>
      )}

      {/* Top Navigation / Search */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Navigation2 className="text-black w-5 h-5" />
              </div>
              <h1 className="text-white font-semibold tracking-tight text-lg">TerraView</h1>
            </div>
            
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5 focus-within:border-emerald-500/50 transition-all">
              <Search className="text-white/40 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search coordinates or city..." 
                className="bg-transparent border-none outline-none text-white text-sm w-64 placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-3 pointer-events-auto">
          <button 
            onClick={flyToCurrentLocation}
            className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl text-white hover:bg-emerald-500 hover:text-black transition-all shadow-xl group"
          >
            <Navigation2 className="w-5 h-5" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black px-2 py-1 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              My Location
            </span>
          </button>
          <button 
            onClick={() => setShowLocations(!showLocations)}
            className={`bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl transition-all shadow-xl group ${showLocations ? 'text-emerald-500 border-emerald-500/50' : 'text-white hover:bg-emerald-500 hover:text-black'}`}
          >
            <MapPin className="w-5 h-5" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black px-2 py-1 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              Quick Locations
            </span>
          </button>
          <button 
            onClick={() => setShowLayers(!showLayers)}
            className={`bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl transition-all shadow-xl group ${showLayers ? 'text-emerald-500 border-emerald-500/50' : 'text-white hover:bg-white hover:text-black'}`}
          >
            <Layers className="w-5 h-5" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black px-2 py-1 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              Simulation Controls
            </span>
          </button>
          <button className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl text-white hover:bg-white hover:text-black transition-all shadow-xl group">
            <Info className="w-5 h-5" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black px-2 py-1 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              System Info
            </span>
          </button>
        </div>
      </div>

      {/* Simulation Controls Panel */}
      {showLayers && (
        <div className="absolute top-24 right-6 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-mono text-xs uppercase tracking-widest opacity-50">Simulation Parameters</h2>
            <button onClick={() => setShowLayers(false)} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className={`w-4 h-4 ${cloudsEnabled ? 'text-emerald-400' : 'text-white/20'}`} />
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Dynamic Clouds</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Orbital Layer</span>
                </div>
              </div>
              <button 
                onClick={() => setCloudsEnabled(!cloudsEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${cloudsEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${cloudsEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wind className={`w-4 h-4 ${atmosphereEnabled ? 'text-emerald-400' : 'text-white/20'}`} />
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Atmosphere</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Rayleigh Scattering</span>
                </div>
              </div>
              <button 
                onClick={() => setAtmosphereEnabled(!atmosphereEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${atmosphereEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${atmosphereEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation2 className={`w-4 h-4 ${lightingEnabled ? 'text-emerald-400' : 'text-white/20'}`} />
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Sun Lighting</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Dynamic Shadows</span>
                </div>
              </div>
              <button 
                onClick={() => setLightingEnabled(!lightingEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${lightingEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${lightingEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border-t border-white/10">
            <p className="text-[9px] text-white/30 leading-relaxed uppercase tracking-tighter">
              Simulation parameters affect real-time rendering performance. Disable layers for high-speed orbital maneuvers.
            </p>
          </div>
        </div>
      )}

      {/* Quick Locations Panel */}
      {showLocations && (
        <div className="absolute top-24 right-6 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-bottom border-white/10 flex justify-between items-center">
            <h2 className="text-white font-mono text-xs uppercase tracking-widest opacity-50">Strategic Points</h2>
            <button onClick={() => setShowLocations(false)} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {FAMOUS_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                onClick={() => flyToLocation(loc.lat, loc.lon, loc.height)}
                className="flex flex-col p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
              >
                <span className="text-white font-medium text-sm group-hover:text-emerald-400 transition-colors">{loc.name}</span>
                <span className="text-white/40 text-[10px] uppercase tracking-wider">{loc.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm border border-white/5 p-4 rounded-2xl pointer-events-auto">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Render Engine</span>
              <span className="text-xs text-emerald-500 font-mono">Cesium WebGL 2.0</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Data Source</span>
              <span className="text-xs text-white/70 font-mono">OSM / Sentinel-2</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Atmosphere</span>
              <span className="text-xs text-white/70 font-mono">Dynamic Rayleigh</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Terrain</span>
              <span className="text-xs text-white/70 font-mono">Enabled (3D)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-black/60 backdrop-blur-sm border border-white/5 px-4 py-2 rounded-full pointer-events-auto">
            <span className="text-[10px] uppercase tracking-widest text-white/50 mr-3">Status</span>
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
            <span className="text-[10px] font-mono text-emerald-500 uppercase">Live Connection</span>
          </div>
        </div>
      </div>

      {/* Custom CSS for Cesium Widgets override */}
      <style>{`
        .cesium-viewer-bottom { display: none !important; }
        .cesium-widget-credits { display: none !important; }
        .cesium-viewer-toolbar { top: 100px !important; right: 24px !important; }
        .cesium-button { background: rgba(0,0,0,0.8) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
        .cesium-button:hover { background: rgba(16, 185, 129, 0.8) !important; }
        .cesium-viewer-geocoderContainer .cesium-geocoder-input { background: rgba(0,0,0,0.8) !important; color: white !important; }
      `}</style>
    </div>
  );
};

export default CesiumGlobe;
