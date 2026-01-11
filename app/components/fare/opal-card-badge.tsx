/**
 * Opal Card Badge Component
 * Shows user's selected Opal card type with official TfNSW assets
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { OpalCardType } from '@/lib/api/types';

interface OpalCardBadgeProps {
  cardType: OpalCardType;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  showLabel?: boolean;
}

const CARD_IMAGES = {
  adult: require('@/assets/tfnsw/opal_cards/OPAL_Front_Adult.png'),
  child: require('@/assets/tfnsw/opal_cards/OPAL_Front_ChildYouth.png'),
  concession: require('@/assets/tfnsw/opal_cards/OPAL_Front_Concession.png'),
  senior: require('@/assets/tfnsw/opal_cards/OPAL_Front_SeniorPensioner.png'),
  student: require('@/assets/tfnsw/opal_cards/OPAL_Front_Student.png'),
} as const;

const CARD_LABELS: Record<OpalCardType, string> = {
  adult: 'Adult',
  child: 'Child/Youth',
  concession: 'Concession',
  senior: 'Senior/Pensioner',
  student: 'Student',
};

const SIZES = {
  sm: { width: 48, height: 30 },
  md: { width: 64, height: 40 },
  lg: { width: 96, height: 60 },
};

export function OpalCardBadge({ 
  cardType, 
  size = 'md', 
  onPress,
  showLabel = false,
}: OpalCardBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const dimensions = SIZES[size];

  const content = (
    <View style={styles.container}>
      <Image
        source={CARD_IMAGES[cardType]}
        style={[styles.card, dimensions]}
        contentFit="contain"
        transition={150}
      />
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {CARD_LABELS[cardType]}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export { CARD_LABELS };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  card: {
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
