import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'Departures',
      label: 'Departures',
      minWidth: '320dp',
      minHeight: '180dp',
      targetCellWidth: 4,
      targetCellHeight: 3,
      description: 'View upcoming departures from your saved stop',
      previewImage: './assets/widget-preview/departures.png',
      updatePeriodMillis: 1800000, // 30 minutes (minimum allowed)
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'bilby',
  slug: 'bilby',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'bilby',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    appleTeamId: 'LV5LL3GM2B',
    bundleIdentifier: 'com.pentestduck.bilby',
    entitlements: {
      'com.apple.security.application-groups': ['group.com.pentestduck.bilby'],
    },
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'This app requires access to your location even when closed.',
      NSLocationWhenInUseUsageDescription:
        'This app requires access to your location when open.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.pentestduck.bilby',
    googleServicesFile: './.credentials/google-services.json',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-maps',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow $(PRODUCT_NAME) to use your location',
        locationWhenInUsePermission:
          'Allow $(PRODUCT_NAME) to use your location',
      },
    ],
    'expo-notifications',
    '@bacons/apple-targets',
    ['react-native-android-widget', widgetConfig],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'a8ca3189-2ccc-44f8-94fe-36de10b42e12',
    },
  },
  owner: 'the-duck-company',
});
