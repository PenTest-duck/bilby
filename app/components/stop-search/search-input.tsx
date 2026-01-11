/**
 * Search Input Component
 * Styled text input for stop search
 */

import { useRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Pressable,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search for a stop...',
  autoFocus = false,
  onFocus,
  onBlur,
  onClear,
}: SearchInputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        }
      ]}
    >
      <IconSymbol 
        name="magnifyingglass" 
        size={20} 
        color={colors.textMuted} 
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value.length > 0 && (
        <Pressable 
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={8}
        >
          <IconSymbol 
            name="xmark.circle.fill" 
            size={20} 
            color={colors.textMuted} 
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
});
