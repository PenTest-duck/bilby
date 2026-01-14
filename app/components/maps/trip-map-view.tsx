/**
 * Trip Map View Component
 * Displays a complete journey with all legs on a map
 */

import { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { MapView, type MapPolyline, type MapMarker, type Coordinates, type CameraPosition } from './map-view';
import { TransportColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Leg, RankedJourney } from '@/lib/api/types';

interface TripMapViewProps {
  journey: RankedJourney;
  selectedLegIndex?: number;
  onLegSelect?: (index: number) => void;
  onClose?: () => void;
  showVehicles?: boolean;
}

// Map TfNSW mode codes to colors
function getModeColor(modeClass?: number): string {
  switch (modeClass) {
    case 1: return TransportColors.train;
    case 2: return TransportColors.metro;
    case 4: return TransportColors.lightRail;
    case 5: return TransportColors.bus;
    case 7: return TransportColors.coach;
    case 9: return TransportColors.ferry;
    default: return TransportColors.walking;
  }
}

// Check if leg is walking
function isWalkingLeg(leg: Leg): boolean {
  // No isWalking field in backend schema - check transportation instead
  const modeClass = leg.transportation?.product?.class;
  return !leg.transportation || modeClass === 99 || modeClass === 100;
}

// Convert leg coordinates to map format
function legToCoordinates(leg: Leg): Coordinates[] {
  // Use path if available, otherwise fallback to origin/destination
  // Backend uses 'coords' not 'path'
  if (leg.coords && leg.coords.length > 0) {
    return leg.coords.map((coord) => ({
      latitude: coord[0],
      longitude: coord[1],
    }));
  }
  
  // Fallback to origin/destination if no path
  const coords: Coordinates[] = [];
  if (leg.origin?.coord) {
    coords.push({ latitude: leg.origin.coord[0], longitude: leg.origin.coord[1] });
  }
  if (leg.destination?.coord) {
    coords.push({ latitude: leg.destination.coord[0], longitude: leg.destination.coord[1] });
  }
  return coords;
}

// Calculate bounding box for all journey coordinates
function calculateBounds(journey: RankedJourney): CameraPosition {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  
  journey.legs.forEach(leg => {
    const coords = legToCoordinates(leg);
    coords.forEach(c => {
      if (c.latitude !== undefined && c.longitude !== undefined) {
        minLat = Math.min(minLat, c.latitude);
        maxLat = Math.max(maxLat, c.latitude);
        minLng = Math.min(minLng, c.longitude);
        maxLng = Math.max(maxLng, c.longitude);
      }
    });
  });
  
  // Calculate center and appropriate zoom
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = maxLat - minLat;
  const lngDelta = maxLng - minLng;
  const maxDelta = Math.max(latDelta, lngDelta);
  
  // Approximate zoom level based on delta
  let zoom = 14;
  if (maxDelta > 0.1) zoom = 12;
  if (maxDelta > 0.2) zoom = 11;
  if (maxDelta > 0.5) zoom = 10;
  
  return {
    coordinates: { latitude: centerLat, longitude: centerLng },
    zoom,
  };
}

export function TripMapView({
  journey,
  selectedLegIndex,
  onLegSelect,
  onClose,
  showVehicles = false,
}: TripMapViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Convert journey legs to polylines
  const polylines = useMemo<MapPolyline[]>(() => {
    return journey.legs.map((leg, index) => {
      const isWalking = isWalkingLeg(leg);
      const modeClass = leg.transportation?.product?.class;
      const color = getModeColor(modeClass);
      const isSelected = selectedLegIndex === index;
      
      return {
        id: `leg-${index}`,
        coordinates: legToCoordinates(leg),
        color: isWalking ? colors.textMuted : color,
        width: isSelected ? 6 : isWalking ? 3 : 4,
        geodesic: !isWalking,
        isDashed: isWalking,
      };
    });
  }, [journey.legs, selectedLegIndex, colors.textMuted]);

  // Create markers for origin, destination, transfers, and intermediate stops
  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [];
    
    // Origin marker
    const firstLeg = journey.legs[0];
    if (firstLeg?.origin?.coord) {
      result.push({
        id: 'origin',
        coordinates: {
          latitude: firstLeg.origin.coord[0],
          longitude: firstLeg.origin.coord[1],
        },
        title: firstLeg.origin.name || 'Start',
        icon: 'origin',
        tintColor: colors.success,
      });
    }
    
    // Destination marker
    const lastLeg = journey.legs[journey.legs.length - 1];
    if (lastLeg?.destination?.coord) {
      result.push({
        id: 'destination',
        coordinates: {
          latitude: lastLeg.destination.coord[0],
          longitude: lastLeg.destination.coord[1],
        },
        title: lastLeg.destination.name || 'End',
        icon: 'destination',
        tintColor: colors.error,
      });
    }
    
    // Transfer markers (intermediate stops between legs)
    for (let i = 0; i < journey.legs.length - 1; i++) {
      const leg = journey.legs[i];
      if (leg.destination?.coord && !isWalkingLeg(leg)) {
        result.push({
          id: `transfer-${i}`,
          coordinates: {
            latitude: leg.destination.coord[0],
            longitude: leg.destination.coord[1],
          },
          title: leg.destination.name || 'Transfer',
          icon: 'transfer',
          tintColor: colors.tint,
        });
      }
    }
    
    // Intermediate stop markers (stops we pass through on each leg)
    journey.legs.forEach((leg, legIndex) => {
      if (isWalkingLeg(leg)) return;
      
      const modeColor = getModeColor(leg.transportation?.product?.class);
      
      // Add markers for stops in the stopSequence
      leg.stopSequence?.forEach((stop, stopIndex) => {
        // Skip first and last stop of each leg (already covered by origin/destination/transfer markers)
        if (stopIndex === 0 || stopIndex === (leg.stopSequence?.length ?? 0) - 1) return;
        
        if (stop.coord) {
          result.push({
            id: `stop-${legIndex}-${stopIndex}`,
            coordinates: {
              latitude: stop.coord[0],
              longitude: stop.coord[1],
            },
            title: stop.name || stop.disassembledName || 'Stop',
            icon: 'stop',
            tintColor: modeColor,
          });
        }
      });
    });
    
    return result;
  }, [journey.legs, colors]);

  // Calculate initial camera position to fit entire journey
  const initialCamera = useMemo(() => calculateBounds(journey), [journey]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialCamera={initialCamera}
        polylines={polylines}
        markers={markers}
        showUserLocation={false}
        showTraffic={false}
      />
      
      {/* Close button */}
      {onClose && (
        <Pressable 
          style={[styles.closeButton, { backgroundColor: colors.card }]}
          onPress={onClose}
        >
          <IconSymbol name="xmark" size={20} color={colors.text} />
        </Pressable>
      )}
      
      {/* Leg selector */}
      {journey.legs.length > 1 && onLegSelect && (
        <View style={[styles.legSelector, { backgroundColor: colors.card }]}>
          {journey.legs.map((leg, index) => {
            const isWalking = isWalkingLeg(leg);
            const modeClass = leg.transportation?.product?.class;
            const color = getModeColor(modeClass);
            const isSelected = selectedLegIndex === index;
            
            return (
              <Pressable
                key={index}
                style={[
                  styles.legButton,
                  isSelected && { backgroundColor: `${color}20` },
                ]}
                onPress={() => onLegSelect(index)}
              >
                <View 
                  style={[
                    styles.legIndicator, 
                    { backgroundColor: isWalking ? colors.textMuted : color }
                  ]} 
                />
                {!isWalking && leg.transportation?.number && (
                  <Text style={[styles.legNumber, { color: colors.text }]}>
                    {leg.transportation.number}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legSelector: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  legIndicator: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  legNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
});
