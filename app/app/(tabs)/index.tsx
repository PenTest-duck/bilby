/**
 * Home Tab - Quick Access Dashboard
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ModeIcon } from '@/components/transport/mode-icon';
import { LineBadge } from '@/components/transport/line-badge';
import { AlertBanner, AlertDetailModal } from '@/components/alerts';
import { LiveIndicator, LastUpdated } from '@/components/realtime';
import { useAuthStore } from '@/stores/auth-store';
import { useServiceStatus } from '@/lib/api/alerts';
import { formatTime, formatRelativeTime } from '@/lib/date';
import type { StatusAlert } from '@/lib/api/types';

// Mock saved trips for demo
const MOCK_SAVED_TRIPS = [
  {
    id: '1',
    name: 'To Work',
    from: 'Central Station',
    to: 'North Sydney',
    nextDeparture: new Date(Date.now() + 8 * 60000).toISOString(),
    modes: [1],
    line: 'T1',
  },
  {
    id: '2', 
    name: 'Home',
    from: 'Martin Place',
    to: 'Bondi Junction',
    nextDeparture: new Date(Date.now() + 15 * 60000).toISOString(),
    modes: [1],
    line: 'T4',
  },
];

const MOCK_RECENT_STOPS = [
  { id: '1', name: 'Central Station', modes: [1, 2] },
  { id: '2', name: 'Town Hall', modes: [1] },
  { id: '3', name: 'Circular Quay', modes: [1, 9] },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [selectedAlert, setSelectedAlert] = useState<StatusAlert | null>(null);
  const { data: statusData, dataUpdatedAt, isLoading: statusLoading } = useServiceStatus();

  const handleTripPress = (trip: typeof MOCK_SAVED_TRIPS[0]) => {
    // Navigate to Plan tab with pre-filled stops
    router.push('/plan');
  };

  const handleStopPress = (stop: typeof MOCK_RECENT_STOPS[0]) => {
    // Navigate to Departures tab with pre-selected stop
    router.push('/departures');
  };

  // Derive status info
  const networkStatus = statusData?.status ?? 'normal';
  const alerts = statusData?.alerts ?? [];
  const hasAlerts = alerts.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            What should I catch?
          </Text>
        </View>

        {/* Quick Trip Cards */}
        {isAuthenticated || MOCK_SAVED_TRIPS.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Trips
              </Text>
              <Pressable onPress={() => router.push('/plan')}>
                <Text style={[styles.seeAll, { color: colors.tint }]}>Plan New</Text>
              </Pressable>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tripsScroll}
            >
              {MOCK_SAVED_TRIPS.map((trip) => (
                <QuickTripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => handleTripPress(trip)}
                />
              ))}
              
              {/* Add new trip card */}
              <Pressable 
                style={[styles.addTripCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                onPress={() => router.push('/plan')}
              >
                <IconSymbol name="plus.circle.fill" size={32} color={colors.tint} />
                <Text style={[styles.addTripText, { color: colors.textSecondary }]}>
                  Add Trip
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : (
          <Card>
            <View style={styles.emptyTrips}>
              <IconSymbol name="bookmark.fill" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Save your trips
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Plan a trip and save it for quick access
              </Text>
              <Button
                title="Plan a Trip"
                onPress={() => router.push('/plan')}
                style={styles.emptyButton}
              />
            </View>
          </Card>
        )}

        {/* Recent Stops */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Stops
            </Text>
            <Pressable onPress={() => router.push('/departures')}>
              <Text style={[styles.seeAll, { color: colors.tint }]}>See All</Text>
            </Pressable>
          </View>
          
          <Card padding="none">
            {MOCK_RECENT_STOPS.map((stop, index) => (
              <Pressable
                key={stop.id}
                style={({ pressed }) => [
                  styles.recentStopRow,
                  pressed && { backgroundColor: colors.backgroundSecondary },
                  index < MOCK_RECENT_STOPS.length - 1 && { 
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => handleStopPress(stop)}
              >
                <View style={styles.stopModes}>
                  {stop.modes.slice(0, 2).map((mode, i) => (
                    <ModeIcon key={i} mode={mode} size="sm" />
                  ))}
                </View>
                <Text style={[styles.stopName, { color: colors.text }]} numberOfLines={1}>
                  {stop.name}
                </Text>
                <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        </View>

        {/* Service Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Service Status
            </Text>
            <LiveIndicator isLive={!statusLoading} size="sm" />
          </View>
          
          {/* Alert Banners */}
          {hasAlerts && alerts.slice(0, 2).map((alert) => (
            <View key={alert.id} style={{ marginBottom: 8 }}>
              <AlertBanner
                alert={alert}
                compact
                onPress={() => setSelectedAlert(alert)}
              />
            </View>
          ))}
          
          <Card>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: networkStatus === 'normal' 
                    ? colors.success 
                    : networkStatus === 'minor' 
                      ? colors.delayed 
                      : colors.cancelled 
                }
              ]} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {networkStatus === 'normal' 
                  ? 'All services running normally'
                  : networkStatus === 'minor'
                    ? 'Minor delays on some services'
                    : 'Major disruptions on the network'}
              </Text>
            </View>
            <LastUpdated dataUpdatedAt={dataUpdatedAt} />
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickAction
            icon="map.fill"
            label="Plan Trip"
            onPress={() => router.push('/plan')}
          />
          <QuickAction
            icon="clock.fill"
            label="Departures"
            onPress={() => router.push('/departures')}
          />
          <QuickAction
            icon="exclamationmark.triangle.fill"
            label="Alerts"
            onPress={() => {}}
          />
          <QuickAction
            icon="gearshape.fill"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </View>
      </ScrollView>

      {/* Alert Detail Modal */}
      <Modal
        visible={selectedAlert !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedAlert && (
          <AlertDetailModal
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function QuickTripCard({ 
  trip, 
  onPress 
}: { 
  trip: typeof MOCK_SAVED_TRIPS[0];
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const countdown = formatRelativeTime(trip.nextDeparture);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tripCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.tripCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.tripHeader}>
        <Text style={[styles.tripName, { color: colors.text }]}>{trip.name}</Text>
        <LineBadge line={trip.line} modeId={trip.modes[0]} size="sm" />
      </View>
      <Text style={[styles.tripRoute, { color: colors.textSecondary }]} numberOfLines={1}>
        {trip.from} → {trip.to}
      </Text>
      <View style={styles.tripFooter}>
        <Text style={[styles.tripCountdown, { color: colors.tint }]}>
          {countdown}
        </Text>
        <Text style={[styles.tripTime, { color: colors.textMuted }]}>
          {formatTime(trip.nextDeparture)}
        </Text>
      </View>
    </Pressable>
  );
}

function QuickAction({ 
  icon, 
  label, 
  onPress 
}: { 
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.backgroundSecondary },
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
    >
      <IconSymbol name={icon as any} size={24} color={colors.tint} />
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  hero: {
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 15,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 15,
    fontWeight: '500',
  },
  tripsScroll: {
    gap: 12,
  },
  tripCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tripCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripName: {
    fontSize: 17,
    fontWeight: '600',
  },
  tripRoute: {
    fontSize: 14,
    marginBottom: 12,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  tripCountdown: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripTime: {
    fontSize: 13,
  },
  addTripCard: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addTripText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTrips: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
  recentStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  stopModes: {
    flexDirection: 'row',
    gap: 4,
  },
  stopName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  statusTime: {
    fontSize: 13,
    marginTop: 6,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
