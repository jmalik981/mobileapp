import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Conditional import for BarCodeScanner - only works in development builds, not Expo Go
let BarCodeScanner: any = null;

try {
  const BarcodeModule = require('expo-barcode-scanner');
  BarCodeScanner = BarcodeModule.BarCodeScanner;
} catch (error) {
  // BarCodeScanner not available in Expo Go
}

export default function QRScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      if (BarCodeScanner) {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(false);
      }
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Parse QR code data - expected format: "thathappyhour://restaurant/[restaurant_id]"
    if (data.startsWith('thathappyhour://restaurant/')) {
      const restaurantId = data.replace('thathappyhour://restaurant/', '');
      
      Alert.alert(
        'Restaurant Found!',
        'Would you like to follow this restaurant to get notified about their deals?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setScanned(false),
          },
          {
            text: 'Follow',
            onPress: () => {
              // TODO: Implement follow restaurant logic
              Alert.alert('Success!', 'You are now following this restaurant!', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not from a That Happy Hour restaurant.',
        [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Fallback UI when BarCodeScanner is not available (Expo Go)
  if (!BarCodeScanner || hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="qr-code-outline" size={64} color="#ccc" />
          <Text style={styles.permissionTitle}>
            {!BarCodeScanner ? 'QR Scanner Not Available' : 'Camera Permission Required'}
          </Text>
          <Text style={styles.permissionMessage}>
            {!BarCodeScanner 
              ? 'QR code scanning is not available in Expo Go.\nUse a development build to access the camera.'
              : 'Please allow camera access to scan QR codes from restaurants.'
            }
          </Text>
          
          <View style={styles.manualEntry}>
            <Text style={styles.manualTitle}>Manual Restaurant Code Entry</Text>
            <Text style={styles.manualSubtitle}>
              Ask the restaurant for their code and enter it below:
            </Text>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => {
                Alert.prompt(
                  'Enter Restaurant Code',
                  'Enter the restaurant code provided by the establishment:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Follow', 
                      onPress: (code) => {
                        if (code && code.trim()) {
                          Alert.alert('Success!', 'You are now following this restaurant!', [
                            { text: 'OK', onPress: () => navigation.goBack() }
                          ]);
                        }
                      }
                    }
                  ],
                  'plain-text'
                );
              }}
            >
              <Text style={styles.manualButtonText}>Enter Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        
        <Text style={styles.instructionText}>
          Point your camera at a restaurant's QR code
        </Text>
        
        {scanned && (
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FF6B35',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  scanAgainButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  settingsButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntry: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  manualSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  manualButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
