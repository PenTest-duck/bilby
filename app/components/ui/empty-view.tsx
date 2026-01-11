/**
 * Empty View Component
 */

import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface EmptyViewProps {
  icon?: string;
  title: string;
  message?: string;
}

export function EmptyView({ 
  icon = 'tray.fill',
  title,
  message,
}: EmptyViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  return (
    <View style={styles.container}>
      <IconSymbol 
        name={icon} 
        size={48} 
        color={colors.textMuted} 
      />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
