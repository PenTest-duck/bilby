/**
 * Transport Mode Icon
 * Official TfNSW mode symbols
 */

import { Image, ImageStyle } from 'expo-image';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { TransportColors } from '@/constants/theme';

type TransportMode = 'train' | 'metro' | 'bus' | 'ferry' | 'lightRail' | 'coach' | 'walking';

interface ModeIconProps {
  mode: TransportMode | number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle | ImageStyle;
}

const MODE_IMAGES = {
  train: require('@/assets/tfnsw/train_mode_symbols_eps_png_white_colour/Train_Mode_Colour_Background_400x400.png'),
  metro: require('@/assets/tfnsw/metro_mode_symbols_eps_png_white_colour_2/Metro_Mode_Colour_Background_400x400.png'),
  bus: require('@/assets/tfnsw/bus_mode_symbols_eps_png_white_colour_1/Bus_Mode_Colour_Background_400x400.png'),
  ferry: require('@/assets/tfnsw/ferry_mode_symbols_eps_png_white_colour/Ferry_Mode_Colour_Background_400x400.png'),
  lightRail: require('@/assets/tfnsw/lightrail_mode_symbols_eps_png_white_colour/LightRail_Mode_Colour_Background_400x400.png'),
  coach: require('@/assets/tfnsw/privatecoach_mode_symbols_eps_png_white_grey/Private_coach_grey_400x400.png'),
  walking: require('@/assets/tfnsw/walking.png'),
} as const;

const SIZES = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 56,
};

/** Map TfNSW mode ID to mode name */
function getModeFromId(id: number): TransportMode {
  switch (id) {
    case 1: return 'train';
    case 2: return 'metro';
    case 4: return 'lightRail';
    case 5: return 'bus';
    case 7: return 'coach';
    case 9: return 'ferry';
    case 100: return 'walking';
    default: return 'bus';
  }
}

export function ModeIcon({ mode, size = 'md', style }: ModeIconProps) {
  const modeName = typeof mode === 'number' ? getModeFromId(mode) : mode;
  const imageSource = MODE_IMAGES[modeName];
  const dimension = SIZES[size];

  if (modeName === 'walking' || !imageSource) {
    return (
      <View 
        style={[
          styles.walkingIcon, 
          { 
            width: dimension, 
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: TransportColors.walking,
          },
          style,
        ]}
      >
        <WalkingFigure size={dimension * 0.6} />
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={[
        { width: dimension, height: dimension, borderRadius: 6 },
        style as ImageStyle,
      ]}
      contentFit="contain"
      transition={200}
    />
  );
}

function WalkingFigure({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.walkingHead, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />
      <View style={[styles.walkingBody, { width: size * 0.15, height: size * 0.4 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  walkingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkingHead: {
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  walkingBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
