'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface DepartureData {
  line: string;
  destination: string;
  scheduledTime: string;
  platform?: string;
  modeColor: string;
}

export interface DeparturesWidgetProps {
  stopName: string;
  departures: DepartureData[];
  lastUpdated: string;
}

const COLORS = {
  background: '#FFFFFF',
  backgroundDark: '#1A1A1A',
  text: '#11181C',
  textSecondary: '#687076',
  textMuted: '#9BA1A6',
  border: '#E1E4E8',
  train: '#F6891F',
  metro: '#009B77',
  bus: '#00B5EF',
  ferry: '#5AB031',
  lightRail: '#EE343F',
  white: '#FFFFFF',
} as const;

function DepartureRow({ departure }: { departure: DepartureData }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        width: 'match_parent',
      }}
    >
      {/* Line badge */}
      <FlexWidget
        style={{
          backgroundColor: departure.modeColor as `#${string}`,
          borderRadius: 4,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={departure.line}
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: COLORS.white,
          }}
        />
      </FlexWidget>

      {/* Destination */}
      <FlexWidget
        style={{
          flex: 1,
          marginLeft: 10,
        }}
      >
        <TextWidget
          text={departure.destination}
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: COLORS.text,
          }}
          maxLines={1}
          truncate="END"
        />
        {departure.platform && (
          <TextWidget
            text={`Platform ${departure.platform}`}
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              marginTop: 2,
            }}
          />
        )}
      </FlexWidget>

      {/* Time */}
      <FlexWidget
        style={{
          alignItems: 'flex-end',
          marginLeft: 8,
        }}
      >
        <TextWidget
          text={departure.scheduledTime}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: COLORS.text,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function DeparturesWidget({
  stopName,
  departures,
  lastUpdated,
}: DeparturesWidgetProps) {
  const hasDepartures = departures.length > 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={stopName}
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: COLORS.text,
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
        <TextWidget
          text={lastUpdated}
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            marginLeft: 8,
          }}
        />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          height: 1,
          width: 'match_parent',
          backgroundColor: COLORS.border,
        }}
      />

      {/* Departures list */}
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          flexDirection: 'column',
        }}
      >
        {hasDepartures ? (
          departures.map((departure, index) => (
            <DepartureRow key={index} departure={departure} />
          ))
        ) : (
          <FlexWidget
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <TextWidget
              text="No upcoming departures"
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
              }}
            />
            <TextWidget
              text="Tap to open app"
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Footer hint */}
      <FlexWidget
        style={{
          paddingHorizontal: 14,
          paddingBottom: 10,
          paddingTop: 4,
          width: 'match_parent',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="Tap for live times"
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function PlaceholderWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <TextWidget
        text="🚆 Bilby"
        style={{
          fontSize: 20,
          fontWeight: '600',
          color: COLORS.text,
        }}
      />
      <TextWidget
        text="Tap to set up departures"
        style={{
          fontSize: 14,
          color: COLORS.textSecondary,
          marginTop: 8,
        }}
      />
    </FlexWidget>
  );
}
