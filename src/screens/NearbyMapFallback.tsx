import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function NearbyMapFallback() {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to show your position on the map');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setUserLocation(location);
        setLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setLoading(false);
      }
    })();
  }, []);

  const openInGoogleMaps = () => {
    if (!userLocation) {
      Alert.alert('Location not available', 'Please wait for your location to be detected');
      return;
    }

    const lat = userLocation.coords.latitude;
    const lng = userLocation.coords.longitude;
    
    // Create Google Maps URL with marker at user location
    const url = Platform.select({
      ios: `maps:${lat},${lng}?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(Your Location)`,
    });

    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.canOpenURL(url!).then((supported) => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        // Fallback to web URL
        Linking.openURL(webUrl);
      }
    });
  };

  const openInBrowser = () => {
    if (!userLocation) {
      Alert.alert('Location not available', 'Please wait for your location to be detected');
      return;
    }

    const lat = userLocation.coords.latitude;
    const lng = userLocation.coords.longitude;
    const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || '';
    
    // Create a web URL with embedded map
    const mapUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=15&maptype=roadmap`;
    
    // Open in browser
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#171717" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={64} color="#999" />
        <Text style={styles.errorText}>Unable to get your location</Text>
        <Text style={styles.subText}>Please check your location settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Ionicons name="location" size={48} color="#171717" />
        <Text style={styles.title}>Your Current Location</Text>
        <Text style={styles.coords}>
          Latitude: {userLocation.coords.latitude.toFixed(6)}
        </Text>
        <Text style={styles.coords}>
          Longitude: {userLocation.coords.longitude.toFixed(6)}
        </Text>
        {userLocation.coords.accuracy && (
          <Text style={styles.accuracy}>
            Accuracy: ±{Math.round(userLocation.coords.accuracy)}m
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={openInGoogleMaps}>
          <Ionicons name="map" size={24} color="#fff" />
          <Text style={styles.buttonText}>Open in Google Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={openInBrowser}>
          <Ionicons name="globe-outline" size={24} color="#171717" />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>View in Browser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpCard}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.helpText}>
          Due to technical limitations, the map will open in Google Maps app or your browser where you can see your location marker clearly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
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
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 16,
  },
  coords: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  accuracy: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    backgroundColor: '#171717',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#171717',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#171717',
  },
  helpCard: {
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
