import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { deliveryAgentsApi } from '../services/api';

// Fix default marker icons (Leaflet + webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = new L.DivIcon({
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

const destinationIcon = new L.DivIcon({
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: '',
});

const restaurantIcon = new L.DivIcon({
  html: `<div style="font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🍽️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: '',
});

// Component to auto-fit the map bounds
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, points]);
  return null;
};

const LiveTrackingMap = ({ orderId, deliveryAddress, restaurantLocation }) => {
  const [driverPos, setDriverPos] = useState(null);
  const [destinationPos, setDestinationPos] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef(null);
  const simStepRef = useRef(0);
  const [geocodeDone, setGeocodeDone] = useState(false);

  // Fallback: Lucknow (Mughlai food capital!)
  const FALLBACK_POS = [26.8467, 80.9462];

  // Geocode the delivery address to get coordinates
  useEffect(() => {
    if (!deliveryAddress) return;

    const geocodeAddress = async () => {
      try {
        const encoded = encodeURIComponent(deliveryAddress);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
          { headers: { 'User-Agent': 'MughalsDastarkhan/1.0' } }
        );
        const data = await resp.json();
        if (data.length > 0) {
          setDestinationPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.warn('Geocoding failed:', err);
      }
      setGeocodeDone(true);
    };
    geocodeAddress();
  }, [deliveryAddress]);

  // Poll driver location every 5 seconds
  useEffect(() => {
    if (!orderId) return;

    const fetchLocation = async () => {
      try {
        const loc = await deliveryAgentsApi.getDriverLocation(orderId);
        if (loc.lat && loc.lng) {
          setDriverPos([loc.lat, loc.lng]);
          setLastUpdate(loc.updated_at);
          setError(null);
        }
      } catch {
        // Silently fail
      }
    };

    fetchLocation();
    pollRef.current = setInterval(fetchLocation, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  // --- Simulate driver movement for testing ---
  const startSimulation = () => {
    if (!orderId) return;
    // Use destination if geocoded, otherwise fallback
    const dest = destinationPos || FALLBACK_POS;
    // Start ~3km north-east of destination
    const startLat = dest[0] + 0.025;
    const startLng = dest[1] + 0.02;
    simStepRef.current = 0;
    const totalSteps = 30;

    // If we don't have a destination on the map yet, set the fallback
    if (!destinationPos) setDestinationPos(FALLBACK_POS);

    const step = async () => {
      const t = Math.min(simStepRef.current / totalSteps, 1);
      // Ease-in: slow start, faster finish
      const eased = t * t;
      const lat = startLat + (dest[0] - startLat) * eased;
      const lng = startLng + (dest[1] - startLng) * eased;
      // Add small random wobble to look realistic
      const wobbleLat = lat + (Math.random() - 0.5) * 0.0005;
      const wobbleLng = lng + (Math.random() - 0.5) * 0.0005;

      try {
        await deliveryAgentsApi.simulateDriverLocation(orderId, wobbleLat, wobbleLng);
      } catch (err) {
        console.warn('Sim location push failed:', err);
      }

      simStepRef.current += 1;
      if (simStepRef.current > totalSteps) {
        setSimulating(false);
        if (simRef.current) clearInterval(simRef.current);
      }
    };

    step();
    simRef.current = setInterval(step, 2000);
    setSimulating(true);
  };

  const stopSimulation = () => {
    if (simRef.current) clearInterval(simRef.current);
    setSimulating(false);
  };

  useEffect(() => {
    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, []);

  // Compute map center and points
  const mapPoints = [];
  if (driverPos) mapPoints.push(driverPos);
  if (destinationPos) mapPoints.push(destinationPos);

  // Default center: Lucknow or first available point
  const defaultCenter = FALLBACK_POS;
  const center = driverPos || destinationPos || defaultCenter;

  // Show simulate button when we have destination geocoded but no driver
  const showSimulatePrompt = !driverPos && destinationPos && !simulating;

  return (
    <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
      {/* Map header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-medium">Live Tracking</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Simulate driver button for testing */}
          {!simulating ? (
            <button
              onClick={startSimulation}
              className="text-[11px] px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-full font-medium transition-colors"
              title="Simulate a delivery driver for testing"
            >
              🧪 Simulate Driver
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="text-[11px] px-2.5 py-1 bg-red-500 hover:bg-red-400 text-white rounded-full font-medium transition-colors animate-pulse"
            >
              ■ Stop Sim
            </button>
          )}
          {lastUpdate && (
            <span className="text-slate-400 text-xs">
              Updated {new Date(lastUpdate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ height: '320px', width: '100%' }} className="relative">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {mapPoints.length > 0 && <FitBounds points={mapPoints} />}

          {/* Driver marker */}
          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>
                <strong>🛵 Delivery Driver</strong><br />
                Your food is on the move!
              </Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {destinationPos && (
            <Marker position={destinationPos} icon={destinationIcon}>
              <Popup>
                <strong>📍 Delivery Address</strong><br />
                {deliveryAddress}
              </Popup>
            </Marker>
          )}

          {/* Line between driver and destination */}
          {driverPos && destinationPos && (
            <Polyline
              positions={[driverPos, destinationPos]}
              pathOptions={{
                color: '#f59e0b',
                weight: 3,
                dashArray: '8, 8',
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>

        {/* Overlay when no driver yet */}
        {!driverPos && !simulating && (
          <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="text-4xl animate-bounce">🛵</span>
            <p className="text-sm font-medium text-slate-600">Waiting for driver's GPS...</p>
            <p className="text-xs text-slate-400">Click <strong className="text-amber-600">🧪 Simulate Driver</strong> above to test</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white px-4 py-2 flex items-center gap-4 text-xs text-slate-500 border-t">
        <span className="flex items-center gap-1">🛵 Driver</span>
        <span className="flex items-center gap-1">📍 Your address</span>
        {driverPos && destinationPos && (
          <span className="ml-auto text-slate-400">
            ~ {estimateDistance(driverPos, destinationPos)} away
          </span>
        )}
      </div>
    </div>
  );
};

// Haversine distance estimate
function estimateDistance(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * (Math.PI / 180);
  const dLon = (b[1] - a[1]) * (Math.PI / 180);
  const lat1 = a[0] * (Math.PI / 180);
  const lat2 = b[0] * (Math.PI / 180);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  const km = R * c;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export default LiveTrackingMap;
