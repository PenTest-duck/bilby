/**
 * Platform Map View Component
 * Wraps Expo Maps for iOS (Apple Maps) and Android (Google Maps)
 */

import { useCallback } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Type definitions for expo-maps coordinates
export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

export interface CameraPosition {
  coordinates?: Coordinates;
  zoom?: number;
}

// Sydney CBD default position
const SYDNEY_DEFAULT: CameraPosition = {
  coordinates: {
    latitude: -33.8688,
    longitude: 151.2093,
  },
  zoom: 13,
};

export interface MapViewProps {
  style?: object;
  initialCamera?: CameraPosition;
  polylines?: MapPolyline[];
  markers?: MapMarker[];
  circles?: MapCircle[];
  onMapClick?: (coordinates: Coordinates) => void;
  onMarkerClick?: (markerId: string) => void;
  onCameraMove?: (camera: CameraPosition & { bearing: number; tilt: number }) => void;
  showUserLocation?: boolean;
  showTraffic?: boolean;
  children?: React.ReactNode;
}

export interface MapPolyline {
  id: string;
  coordinates: Coordinates[];
  color?: string;
  width?: number;
  geodesic?: boolean;
  isDashed?: boolean;
}

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  title?: string;
  tintColor?: string;
  icon?: 'stop' | 'vehicle' | 'origin' | 'destination' | 'transfer';
}

export interface MapCircle {
  id: string;
  center: Coordinates;
  radius: number;
  color?: string;
  lineColor?: string;
  lineWidth?: number;
}

export interface MapViewRef {
  setCameraPosition: (position: CameraPosition, duration?: number) => void;
  fitToCoordinates: (coordinates: Coordinates[], padding?: number) => void;
}

export function MapView({
  style,
  initialCamera = SYDNEY_DEFAULT,
  polylines = [],
  markers = [],
  circles = [],
  onMapClick,
  onMarkerClick,
  onCameraMove,
  showUserLocation = false,
  showTraffic = false,
}: MapViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Convert polylines to platform-specific format
  const applePolylines = polylines.map(p => ({
    id: p.id,
    coordinates: p.coordinates as any[],
    color: p.color ?? colors.tint,
    width: p.width ?? 4,
  }));

  const googlePolylines = polylines.map(p => ({
    id: p.id,
    coordinates: p.coordinates as any[],
    color: p.color ?? colors.tint,
    width: p.width ?? 4,
    geodesic: p.geodesic ?? false,
  }));

  // Convert markers to platform-specific format
  const appleMarkers = markers.map(m => ({
    id: m.id,
    coordinates: m.coordinates,
    title: m.title,
    tintColor: m.tintColor ?? colors.tint,
    systemImage: getAppleSystemImage(m.icon),
  }));

  const googleMarkers = markers.map(m => ({
    id: m.id,
    coordinates: m.coordinates,
    title: m.title,
    showCallout: !!m.title,
  }));

  // Convert circles to platform-specific format
  const appleCircles = circles.map(c => ({
    id: c.id,
    center: c.center,
    radius: c.radius,
    color: c.color ?? `${colors.tint}40`,
    lineColor: c.lineColor ?? colors.tint,
    lineWidth: c.lineWidth ?? 2,
  }));

  const googleCircles = circles.map(c => ({
    id: c.id,
    center: c.center,
    radius: c.radius,
    color: c.color ?? `${colors.tint}40`,
    lineColor: c.lineColor ?? colors.tint,
    lineWidth: c.lineWidth ?? 2,
  }));

  // Handle marker clicks
  const handleAppleMarkerClick = useCallback((marker: { id?: string }) => {
    if (marker.id && onMarkerClick) {
      onMarkerClick(marker.id);
    }
  }, [onMarkerClick]);

  const handleGoogleMarkerClick = useCallback((marker: { id?: string }) => {
    if (marker.id && onMarkerClick) {
      onMarkerClick(marker.id);
    }
  }, [onMarkerClick]);

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={[styles.map, style]}
        cameraPosition={initialCamera as any}
        polylines={applePolylines as any}
        markers={appleMarkers as any}
        circles={appleCircles as any}
        onMapClick={onMapClick ? (e: any) => onMapClick(e.coordinates) : undefined}
        onMarkerClick={handleAppleMarkerClick as any}
        onCameraMove={onCameraMove as any}
        properties={{
          isMyLocationEnabled: showUserLocation,
          isTrafficEnabled: showTraffic,
        }}
        uiSettings={{
          compassEnabled: true,
          scaleBarEnabled: true,
          myLocationButtonEnabled: showUserLocation,
        }}
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <GoogleMaps.View
        style={[styles.map, style]}
        cameraPosition={initialCamera as any}
        polylines={googlePolylines as any}
        markers={googleMarkers as any}
        circles={googleCircles as any}
        onMapClick={onMapClick ? (e: any) => onMapClick(e.coordinates) : undefined}
        onMarkerClick={handleGoogleMarkerClick as any}
        onCameraMove={onCameraMove as any}
        properties={{
          isMyLocationEnabled: showUserLocation,
          isTrafficEnabled: showTraffic,
        }}
        uiSettings={{
          compassEnabled: true,
          scaleBarEnabled: true,
          myLocationButtonEnabled: showUserLocation,
          zoomControlsEnabled: true,
        }}
      />
    );
  }

  // Fallback for web/unsupported platforms
  return (
    <View style={[styles.fallback, style, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
        Maps are only available on iOS and Android
      </Text>
    </View>
  );
}

function getAppleSystemImage(icon?: MapMarker['icon']): string {
  switch (icon) {
    case 'stop': return 'circle.fill';
    case 'vehicle': return 'tram.fill';
    case 'origin': return 'figure.walk';
    case 'destination': return 'flag.fill';
    case 'transfer': return 'arrow.triangle.swap';
    default: return 'mappin';
  }
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 16,
  },
});
