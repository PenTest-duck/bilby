/**
 * Go Button Component
 * 
 * Starts a Live Activity for journey tracking when the user
 * is ready to begin their trip.
 */

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useLiveActivity } from '@/hooks/use-live-activity'
import type { RankedJourney } from '@/lib/api/types'

interface GoButtonProps {
  journey: RankedJourney
  onActivityStarted?: (activityId: string) => void
  onActivityEnded?: () => void
  disabled?: boolean
}

export function GoButton({
  journey,
  onActivityStarted,
  onActivityEnded,
  disabled = false,
}: GoButtonProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  
  const {
    isSupported,
    activeActivityId,
    startActivity,
    endActivity,
  } = useLiveActivity()
  
  const [isLoading, setIsLoading] = useState(false)
  const isActive = !!activeActivityId

  const handlePress = useCallback(async () => {
    if (disabled || isLoading) return

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (isActive) {
      // End the current activity
      Alert.alert(
        'End Journey Tracking?',
        'This will stop the Live Activity on your lock screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true)
              try {
                await endActivity()
                onActivityEnded?.()
              } catch (error) {
                console.error('Failed to end activity:', error)
              } finally {
                setIsLoading(false)
              }
            },
          },
        ]
      )
    } else {
      // Start a new activity
      setIsLoading(true)
      try {
        const activityId = await startActivity(journey)
        if (activityId) {
          onActivityStarted?.(activityId)
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } catch (error) {
        console.error('Failed to start activity:', error)
        Alert.alert(
          'Unable to Start',
          'Could not start journey tracking. Please make sure Live Activities are enabled in your device settings.',
          [{ text: 'OK' }]
        )
      } finally {
        setIsLoading(false)
      }
    }
  }, [disabled, isLoading, isActive, journey, startActivity, endActivity, onActivityStarted, onActivityEnded])

  // Don't render on non-iOS or if not supported
  if (Platform.OS !== 'ios' || !isSupported) {
    return null
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isActive ? colors.error : colors.tint,
          opacity: (disabled || isLoading) ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isActive ? 'stop' : 'navigate'}
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.text}>
          {isLoading ? 'Loading...' : isActive ? 'End' : 'Go'}
        </Text>
      </View>
    </Pressable>
  )
}

/**
 * Compact version for inline use
 */
export function GoButtonCompact({
  journey,
  onActivityStarted,
  onActivityEnded,
}: GoButtonProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  
  const {
    isSupported,
    activeActivityId,
    startActivity,
    endActivity,
  } = useLiveActivity()
  
  const [isLoading, setIsLoading] = useState(false)
  const isActive = !!activeActivityId

  const handlePress = useCallback(async () => {
    if (isLoading) return

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (isActive) {
      setIsLoading(true)
      try {
        await endActivity()
        onActivityEnded?.()
      } catch (error) {
        console.error('Failed to end activity:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsLoading(true)
      try {
        const activityId = await startActivity(journey)
        if (activityId) {
          onActivityStarted?.(activityId)
        }
      } catch (error) {
        console.error('Failed to start activity:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [isLoading, isActive, journey, startActivity, endActivity, onActivityStarted, onActivityEnded])

  if (Platform.OS !== 'ios' || !isSupported) {
    return null
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      style={({ pressed }) => [
        styles.compactButton,
        {
          backgroundColor: isActive ? colors.error : colors.tint,
          opacity: isLoading ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons
        name={isActive ? 'stop' : 'navigate'}
        size={18}
        color="#FFFFFF"
      />
    </Pressable>
  )
}

/**
 * Activity Status Indicator
 * Shows when a Live Activity is running
 */
export function ActivityStatusIndicator() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  
  const { activeActivityId, isSupported } = useLiveActivity()

  if (!isSupported || !activeActivityId) {
    return null
  }

  return (
    <View style={[styles.statusIndicator, { backgroundColor: colors.tint }]}>
      <Ionicons name="radio" size={12} color="#FFFFFF" />
      <Text style={styles.statusText}>Live</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  compactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
})
