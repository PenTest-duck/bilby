/**
 * Error View Component
 */

import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from './button';
import { IconSymbol } from './icon-symbol';

interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ 
  title = 'Something went wrong',
  message = 'Please try again later.',
  onRetry,
}: ErrorViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  return (
    <View style={styles.container}>
      <IconSymbol 
        name="exclamationmark.triangle.fill" 
        size={48} 
        color={colors.error} 
      />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Button 
          title="Try Again" 
          onPress={onRetry} 
          variant="secondary"
          style={styles.button}
        />
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
  button: {
    marginTop: 24,
  },
});
