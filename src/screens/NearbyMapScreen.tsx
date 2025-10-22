import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Alert, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// react-native-maps (works in dev builds; Expo Go requires the community plugin or dev client)
import MapView, { Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Circle } from 'react-native-maps';

const DEFAULT_REGION: Region = {
  latitude: 29.7604, // Houston default center
  longitude: -95.3698,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function NearbyMapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<string>('unknown');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        console.log('Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', status);
        
        if (isMounted) {
          setLocationPermission(status);
        }
        
        if (status !== 'granted') {
          console.log('Location permission denied');
          Alert.alert(
            'Location Permission Required',
            'Please enable location access to see your position on the map.',
            [{ text: 'OK' }]
          );
          if (isMounted) setLoading(false);
          return;
        }

        console.log('Getting current position...');
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        console.log('Current location:', current.coords);
        
        if (!isMounted) return;
        
        setUserLocation(current);
        const nextRegion: Region = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(nextRegion);
        setLoading(false);
        
        // Animate after initial render
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(nextRegion, 1000);
          }
        }, 500);
      } catch (e) {
        console.error('Location error:', e);
        if (isMounted) {
          setLoading(false);
          Alert.alert('Location Error', 'Unable to get your current location. Please check your location settings.');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      const nextRegion: Region = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(nextRegion, 1000);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        userLocationAnnotationTitle="Your Location"
        userLocationUpdateInterval={5000}
        userLocationFastestInterval={2000}
        mapType="standard"
        showsCompass={true}
        showsScale={true}
        showsBuildings={false}
        zoomEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={false}
        onMapReady={() => {
          setMapReady(true);
          // Force location update after map is ready
          if (userLocation && mapRef.current) {
            setTimeout(() => {
              mapRef.current?.animateToRegion({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }, 500);
          }
        }}
      >
        {/* Fallback: Add a marker if native location doesn't show */}
        {mapReady && userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.customMarker}>
              <View style={styles.markerOuter} />
              <View style={styles.markerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Center on user button */}
      {userLocation && (
        <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color="#171717" />
        </TouchableOpacity>
      )}

      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Permission: {locationPermission}
          {userLocation && ` | Lat: ${userLocation.coords.latitude.toFixed(4)}, Lng: ${userLocation.coords.longitude.toFixed(4)}`}
          {userLocation && ` | Accuracy: ${userLocation.coords.accuracy?.toFixed(0)}m`}
        </Text>
        <Text style={styles.debugText}>
          Map Provider: Default | Marker: {userLocation ? 'Should be visible' : 'No location'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  locationOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(65, 105, 225, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(65, 105, 225, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#171717',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 5,
  },
  indicatorText: {
    position: 'absolute',
    bottom: -20,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  customMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOuter: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(65, 105, 225, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(65, 105, 225, 0.6)',
  },
  markerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#171717',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
  },
  locationText: {
    position: 'absolute',
    top: 45,
    fontSize: 12,
    color: '#171717',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 105, 225, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(65, 105, 225, 0.5)',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  userLocationContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 105, 225, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(65, 105, 225, 0.5)',
  },
  userLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  centerButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});
