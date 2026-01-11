/**
 * Settings Tab
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const { isAuthenticated, user, logout } = useAuthStore();
  const { defaultStrategy, accessibilityRequired } = usePreferencesStore();

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
});
