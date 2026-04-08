import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { COLORS } from '../constants/theme';

// Restaurant coordinates - should match your backend
const RESTAURANT_COORDS = {
  latitude: 26.8467,
  longitude: 80.9462,
};

export default function LiveMap({ driverPos, order, style }) {
  const [route, setRoute] = useState([]);
  const [destination, setDestination] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: RESTAURANT_COORDS.latitude,
    longitude: RESTAURANT_COORDS.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Parse delivery address coordinates if available
  useEffect(() => {
    if (order?.delivery_address?.coordinates) {
      setDestination({
        latitude: order.delivery_address.coordinates.lat,
        longitude: order.delivery_address.coordinates.lng,
      });
    } else if (order?.delivery_address?.lat && order?.delivery_address?.lng) {
      setDestination({
        latitude: order.delivery_address.lat,
        longitude: order.delivery_address.lng,
      });
    } else if (order?.delivery_coords) {
      setDestination({
        latitude: order.delivery_coords.latitude,
        longitude: order.delivery_coords.longitude,
      });
    }
  }, [order]);

  // Calculate region to fit all points
  useEffect(() => {
    const points = [RESTAURANT_COORDS];
    if (driverPos) points.push(driverPos);
    if (destination) points.push(destination);

    if (points.length > 1) {
      const latitudes = points.map(p => p.latitude);
      const longitudes = points.map(p => p.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const padding = 0.01; // Add some padding
      setMapRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + padding * 2,
        longitudeDelta: (maxLng - minLng) + padding * 2,
      });
    }

    // Create route polyline
    if (driverPos && destination) {
      setRoute([driverPos, destination]);
    } else if (driverPos) {
      setRoute([RESTAURANT_COORDS, driverPos]);
    } else {
      setRoute([]);
    }
  }, [driverPos, destination]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        region={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Restaurant Marker */}
        <Marker
          coordinate={RESTAURANT_COORDS}
          title="Restaurant"
          description="The Mughal's Dastarkhan"
        >
          <View style={styles.restaurantMarker}>
            <Text style={styles.markerEmoji}>🍽️</Text>
            <View style={styles.markerLabel}>
              <Text style={styles.markerLabelText}>Restaurant</Text>
            </View>
          </View>
        </Marker>

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Delivery Address"
            description={order?.delivery_address?.address || 'Your location'}
          >
            <View style={styles.destinationMarker}>
              <Text style={styles.markerEmoji}>📍</Text>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText}>You</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverPos && (
          <Marker
            coordinate={driverPos}
            title="Driver"
            description={order?.driver_name || order?.delivery_agent_name || 'Your delivery partner'}
          >
            <View style={styles.driverMarker}>
              <View style={styles.driverPulse} />
              <Text style={styles.driverEmoji}>🛵</Text>
              <View style={[styles.markerLabel, styles.driverLabel]}>
                <Text style={[styles.markerLabelText, styles.driverLabelText]}>
                  {order?.driver_name || 'Driver'}
                </Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeColor="#6366f1"
            strokeWidth={4}
            lineDashPattern={[1, 0]}
          />
        )}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Restaurant</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Driver</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Destination</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  restaurantMarker: {
    alignItems: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
  },
  driverMarker: {
    alignItems: 'center',
    position: 'relative',
  },
  markerEmoji: {
    fontSize: 28,
  },
  driverEmoji: {
    fontSize: 32,
    zIndex: 2,
  },
  driverPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    zIndex: 1,
  },
  markerLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: -4,
  },
  markerLabelText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  driverLabel: {
    backgroundColor: '#22c55e',
  },
  driverLabelText: {
    color: COLORS.white,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray700,
  },
});
