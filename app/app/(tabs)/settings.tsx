/**
 * Settings Tab
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OpalCardBadge, CARD_LABELS } from '@/components/fare';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import type { OpalCardType } from '@/lib/api/types';

const OPAL_CARD_TYPES: OpalCardType[] = ['adult', 'child', 'concession', 'senior', 'student'];

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const { isAuthenticated, user, logout } = useAuthStore();
  const { defaultStrategy, accessibilityRequired, opalCardType, setOpalCardType } = usePreferencesStore();
  const [showOpalPicker, setShowOpalPicker] = useState(false);

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
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Default Strategy
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {defaultStrategy}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder, { borderTopColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Accessibility
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {accessibilityRequired ? 'Required' : 'Not required'}
            </Text>
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
});
