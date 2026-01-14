/**
 * Live Activity Notifications Hook
 * 
 * Handles push notifications for Live Activity updates.
 * When the app receives a notification with Live Activity data,
 * this hook updates the Live Activity locally.
 */

import { useEffect, useCallback, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as LiveActivity from '../modules/expo-live-activity/src'
import type { ContentState } from '../modules/expo-live-activity/src'

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined
    
    // For Live Activity updates, don't show a visible notification
    if (data?.type === 'live_activity_update') {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      }
    }
    
    // For journey alerts, show the notification
    if (data?.type === 'journey_alert') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: data?.severity === 'critical',
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }
    }
    
    // Default behavior for other notifications
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }
  },
})

interface LiveActivityNotificationData {
  type: 'live_activity_update' | 'live_activity_end' | 'journey_alert'
  activityId: string
  state?: ContentState
  severity?: 'info' | 'warning' | 'critical'
  timestamp?: number
}

interface UseLiveActivityNotificationsOptions {
  onUpdate?: (activityId: string, state: ContentState) => void
  onEnd?: (activityId: string) => void
  onAlert?: (activityId: string, title: string, body: string, severity: string) => void
}

/**
 * Hook to handle Live Activity notifications
 */
export function useLiveActivityNotifications(
  options?: UseLiveActivityNotificationsOptions
) {
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);

  // Handle received notification
  const handleNotification = useCallback(
    async (notification: Notifications.Notification) => {
      const rawData = notification.request.content.data as Record<string, unknown> | undefined
      
      if (!rawData?.type || !rawData?.activityId) {
        return
      }
      
      const data = rawData as unknown as LiveActivityNotificationData

      console.log(`Received ${data.type} notification for activity ${data.activityId}`)

      switch (data.type) {
        case 'live_activity_update':
          if (data.state) {
            try {
              // Update the Live Activity locally
              await LiveActivity.updateActivity(data.activityId, data.state)
              options?.onUpdate?.(data.activityId, data.state)
            } catch (error) {
              console.error('Failed to update Live Activity:', error)
            }
          }
          break

        case 'live_activity_end':
          try {
            // End the Live Activity
            await LiveActivity.endActivity(data.activityId, data.state, 'default')
            options?.onEnd?.(data.activityId)
          } catch (error) {
            console.error('Failed to end Live Activity:', error)
          }
          break

        case 'journey_alert':
          const content = notification.request.content
          options?.onAlert?.(
            data.activityId,
            content.title || 'Journey Alert',
            content.body || '',
            data.severity || 'info'
          )
          break
      }
    },
    [options]
  )

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const rawData = response.notification.request.content.data as Record<string, unknown> | undefined
      
      if (!rawData?.activityId) {
        return
      }
      
      const data = rawData as unknown as LiveActivityNotificationData

      console.log(`User tapped notification for activity ${data.activityId}`)
      
      // The app can navigate to the relevant screen based on the activity
      // This is handled by the app's deep linking setup
    },
    []
  )

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotification
    )

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    )

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [handleNotification, handleNotificationResponse])

  return {
    // Exposed for manual testing
    handleNotification,
  }
}

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted')
      return null
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
    
    return tokenData.data
  } catch (error) {
    console.error('Failed to register for push notifications:', error)
    return null
  }
}
