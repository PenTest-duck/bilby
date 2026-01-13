/**
 * Settings Tab
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OpalCardBadge, CARD_LABELS } from '@/components/fare';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import type { OpalCardType, RankingStrategy } from '@/lib/api/types';

const OPAL_CARD_TYPES: OpalCardType[] = ['adult', 'child', 'concession', 'senior', 'student'];

const STRATEGIES: { value: RankingStrategy; label: string; description: string }[] = [
  { value: 'best', label: 'Best', description: 'Balanced recommendation' },
  { value: 'fastest', label: 'Fastest', description: 'Minimize total journey time' },
  { value: 'least_walking', label: 'Less Walking', description: 'Minimize walking distance' },
  { value: 'fewest_transfers', label: 'Fewest Transfers', description: 'Minimize interchanges' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const { isAuthenticated, user, logout } = useAuthStore();
  const { 
    defaultStrategy, 
    accessibilityRequired, 
    opalCardType, 
    setOpalCardType,
    setDefaultStrategy,
    setAccessibilityRequired,
  } = usePreferencesStore();
  const [showOpalPicker, setShowOpalPicker] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <Card>
          {isAuthenticated ? (
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Signed in as
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {user?.email || 'Unknown'}
              </Text>
              <Button 
                title="Sign Out" 
                variant="secondary" 
                onPress={logout}
                style={styles.button}
              />
            </View>
          ) : (
            <View>
              <Text style={[styles.value, { color: colors.text }]}>
                Guest Mode
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Sign in to save your trips and preferences
              </Text>
              <Button 
                title="Sign In" 
                onPress={() => {/* TODO: Navigate to auth */}}
                style={styles.button}
              />
            </View>
          )}
        </Card>

        {/* Opal Card Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Opal Card
        </Text>
        <Card>
          <Pressable 
            style={styles.opalRow}
            onPress={() => setShowOpalPicker(true)}
          >
            <View style={styles.opalInfo}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Card Type
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {CARD_LABELS[opalCardType]}
              </Text>
            </View>
            <View style={styles.opalCardPreview}>
              <OpalCardBadge cardType={opalCardType} size="md" />
              <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
            </View>
          </Pressable>
          <Text style={[styles.opalHint, { color: colors.textMuted }]}>
            Fares shown will be based on your card type
          </Text>
        </Card>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preferences
        </Text>
        <Card>
          <Pressable 
            style={styles.row}
            onPress={() => setShowStrategyPicker(true)}
          >
            <View style={styles.rowContent}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Default Strategy
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {STRATEGIES.find(s => s.value === defaultStrategy)?.label || defaultStrategy}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textMuted} />
          </Pressable>
          
          <View style={[styles.row, styles.rowBorder, { borderTopColor: colors.border }]}>
            <View style={styles.rowContent}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Accessibility Required
              </Text>
              <Text style={[styles.accessibilityHint, { color: colors.textMuted }]}>
                Show only wheelchair accessible routes
              </Text>
            </View>
            <Switch
              value={accessibilityRequired}
              onValueChange={setAccessibilityRequired}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <Card>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Version
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>1.0.0</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Opal Card Picker Modal */}
      <Modal
        visible={showOpalPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Opal Card
            </Text>
            <Pressable onPress={() => setShowOpalPicker(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.textMuted} />
            </Pressable>
          </View>
          
          <ScrollView contentContainerStyle={styles.cardGrid}>
            {OPAL_CARD_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.cardOption,
                  { 
                    backgroundColor: colors.card,
                    borderColor: type === opalCardType ? colors.tint : colors.border,
                    borderWidth: type === opalCardType ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  setOpalCardType(type);
                  setShowOpalPicker(false);
                }}
              >
                <OpalCardBadge cardType={type} size="lg" />
                <Text style={[
                  styles.cardOptionLabel, 
                  { color: type === opalCardType ? colors.tint : colors.text }
                ]}>
                  {CARD_LABELS[type]}
                </Text>
                {type === opalCardType && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.tint} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Strategy Picker Modal */}
      <Modal
        visible={showStrategyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Default Strategy
            </Text>
            <Pressable onPress={() => setShowStrategyPicker(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.textMuted} />
            </Pressable>
          </View>
          
          <ScrollView contentContainerStyle={styles.cardGrid}>
            {STRATEGIES.map((strategy) => (
              <Pressable
                key={strategy.value}
                style={[
                  styles.strategyOption,
                  { 
                    backgroundColor: colors.card,
                    borderColor: strategy.value === defaultStrategy ? colors.tint : colors.border,
                    borderWidth: strategy.value === defaultStrategy ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  setDefaultStrategy(strategy.value);
                  setShowStrategyPicker(false);
                }}
              >
                <View style={styles.strategyInfo}>
                  <Text style={[
                    styles.strategyLabel, 
                    { color: strategy.value === defaultStrategy ? colors.tint : colors.text }
                  ]}>
                    {strategy.label}
                  </Text>
                  <Text style={[styles.strategyDescription, { color: colors.textSecondary }]}>
                    {strategy.description}
                  </Text>
                </View>
                {strategy.value === defaultStrategy && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.tint} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    marginTop: 16,
  },
  opalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opalInfo: {
    flex: 1,
  },
  opalCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opalHint: {
    fontSize: 12,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cardGrid: {
    padding: 16,
    gap: 12,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  cardOptionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  rowContent: {
    flex: 1,
  },
  accessibilityHint: {
    fontSize: 12,
    marginTop: 2,
  },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  strategyInfo: {
    flex: 1,
  },
  strategyLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  strategyDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});
