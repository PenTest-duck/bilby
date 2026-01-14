import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Platform } from 'react-native';
import { WIDGET_DATA_KEY, type WidgetData } from './widget-task-handler';

const MODE_COLORS: Record<number, string> = {
  1: '#F6891F', // train
  2: '#009B77', // metro
  4: '#EE343F', // light rail
  5: '#00B5EF', // bus
  7: '#742283', // coach
  9: '#5AB031', // ferry
  11: '#FDD835', // school bus
};

export function getModeColor(modeId?: number): string {
  return MODE_COLORS[modeId ?? 5] ?? '#00B5EF';
}

export interface SetWidgetStopParams {
  stopId: string;
  stopName: string;
}

export async function setWidgetStop(params: SetWidgetStopParams): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bilby-backend.vercel.app';

  try {
    const response = await fetch(
      `${API_URL}/api/departures/${encodeURIComponent(params.stopId)}?limit=4`
    );

    if (!response.ok) {
      console.error('[Widget] Failed to fetch departures:', response.status);
      return;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error('[Widget] API error:', result.error);
      return;
    }

    const { departures } = result.data;

    const widgetData: WidgetData = {
      stopId: params.stopId,
      stopName: params.stopName,
      departures: departures.slice(0, 4).map((dep: any) => ({
        line: dep.transportation?.number || dep.transportation?.disassembledName || '?',
        destination: dep.transportation?.destination?.name || 'Unknown',
        scheduledTime: dep.departureTimeEstimated || dep.departureTimePlanned || '',
        platform: dep.platform,
        modeId: dep.transportation?.product?.class,
      })),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(widgetData));

    // Request widget update
    await requestWidgetUpdate({
      widgetName: 'Departures',
      renderWidget: () => {
        // This will trigger the task handler to re-render
        return null as any;
      },
      widgetNotFound: () => {
        // Widget not added to home screen yet, that's fine
      },
    });
  } catch (error) {
    console.error('[Widget] Error setting widget stop:', error);
  }
}

export async function getWidgetStop(): Promise<{ stopId: string; stopName: string } | null> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      const parsed = JSON.parse(data) as WidgetData;
      return { stopId: parsed.stopId, stopName: parsed.stopName };
    }
  } catch (error) {
    console.error('[Widget] Error getting widget stop:', error);
  }
  return null;
}

export async function clearWidgetData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WIDGET_DATA_KEY);
  } catch (error) {
    console.error('[Widget] Error clearing widget data:', error);
  }
}

export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const currentStop = await getWidgetStop();
  if (currentStop) {
    await setWidgetStop(currentStop);
  }
}
