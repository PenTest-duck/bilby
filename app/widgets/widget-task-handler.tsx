import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeparturesWidget,
  PlaceholderWidget,
  type DepartureData,
} from './DeparturesWidget';

const WIDGET_DATA_KEY = 'bilby-widget-data';

const MODE_COLORS: Record<number, string> = {
  1: '#F6891F', // train
  2: '#009B77', // metro
  4: '#EE343F', // light rail
  5: '#00B5EF', // bus
  7: '#742283', // coach
  9: '#5AB031', // ferry
  11: '#FDD835', // school bus
};

function getModeColor(modeId?: number): string {
  return MODE_COLORS[modeId ?? 5] ?? '#00B5EF';
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

function formatLastUpdated(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return 'Stale';
}

export interface WidgetData {
  stopId: string;
  stopName: string;
  departures: {
    line: string;
    destination: string;
    scheduledTime: string;
    platform?: string;
    modeId?: number;
  }[];
  updatedAt: number;
}

async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data) as WidgetData;
    }
  } catch (error) {
    console.error('[Widget] Failed to get widget data:', error);
  }
  return null;
}

async function fetchAndCacheDepartures(
  stopId: string,
  stopName: string
): Promise<WidgetData | null> {
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bilby-backend.vercel.app';
    const response = await fetch(
      `${API_URL}/api/departures/${encodeURIComponent(stopId)}?limit=4`
    );

    if (!response.ok) {
      console.error('[Widget] API response not ok:', response.status);
      return null;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error('[Widget] API returned error:', result.error);
      return null;
    }

    const { departures } = result.data;

    const widgetData: WidgetData = {
      stopId,
      stopName,
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
    return widgetData;
  } catch (error) {
    console.error('[Widget] Failed to fetch departures:', error);
    return null;
  }
}

const nameToWidget = {
  Departures: DeparturesWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName as keyof typeof nameToWidget;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const cachedData = await getWidgetData();

      if (!cachedData) {
        props.renderWidget(<PlaceholderWidget />);
        return;
      }

      // Try to fetch fresh data on update
      if (props.widgetAction === 'WIDGET_UPDATE') {
        const freshData = await fetchAndCacheDepartures(
          cachedData.stopId,
          cachedData.stopName
        );
        if (freshData) {
          const departures: DepartureData[] = freshData.departures.map((d) => ({
            line: d.line,
            destination: d.destination,
            scheduledTime: formatTime(d.scheduledTime),
            platform: d.platform,
            modeColor: getModeColor(d.modeId),
          }));

          props.renderWidget(
            <DeparturesWidget
              stopName={freshData.stopName}
              departures={departures}
              lastUpdated={formatLastUpdated(freshData.updatedAt)}
            />
          );
          return;
        }
      }

      // Use cached data
      const departures: DepartureData[] = cachedData.departures.map((d) => ({
        line: d.line,
        destination: d.destination,
        scheduledTime: formatTime(d.scheduledTime),
        platform: d.platform,
        modeColor: getModeColor(d.modeId),
      }));

      props.renderWidget(
        <DeparturesWidget
          stopName={cachedData.stopName}
          departures={departures}
          lastUpdated={formatLastUpdated(cachedData.updatedAt)}
        />
      );
      break;
    }

    case 'WIDGET_DELETED':
      // Clean up if needed
      break;

    case 'WIDGET_CLICK':
      // Handle custom click actions if needed
      // OPEN_APP is handled automatically
      break;

    default:
      break;
  }
}

export { WIDGET_DATA_KEY };
