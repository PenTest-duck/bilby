/**
 * Push Notification Service
 * 
 * Uses Expo Push Service (expo-server-sdk) to send push notifications.
 * For Live Activity updates, we send a silent push notification that
 * wakes the app, which then updates the Live Activity locally.
 */

import { Expo, ExpoPushMessage } from 'expo-server-sdk'
import { getRedis } from './redis.js'
import type { ContentState } from '../types/live-activity.js'

// Initialize Expo SDK with optional access token for enhanced security
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
})

// Keys for Redis storage
const PUSH_RECEIPTS_KEY = 'push_receipts:pending'
const DEVICE_TOKENS_KEY = 'device_tokens'

/**
 * Validate an Expo push token
 */
export function isValidExpoPushToken(token: string): boolean {
  return Expo.isExpoPushToken(token)
}

/**
 * Store a device's Expo push token
 */
export async function registerDeviceToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  if (!isValidExpoPushToken(expoPushToken)) {
    throw new Error(`Invalid Expo push token: ${expoPushToken}`)
  }
  
  const redis = await getRedis()
  await redis.hSet(DEVICE_TOKENS_KEY, userId, expoPushToken)
}

/**
 * Get a user's Expo push token
 */
export async function getDeviceToken(userId: string): Promise<string | null> {
  const redis = await getRedis()
  const token = await redis.hGet(DEVICE_TOKENS_KEY, userId)
  return token ?? null
}

/**
 * Remove a device token (e.g., when user logs out or token becomes invalid)
 */
export async function removeDeviceToken(userId: string): Promise<void> {
  const redis = await getRedis()
  await redis.hDel(DEVICE_TOKENS_KEY, userId)
}

/**
 * Send a push notification to update a Live Activity
 * 
 * This sends a silent/background notification that wakes the app,
 * allowing it to update the Live Activity with the new state.
 */
export async function sendLiveActivityUpdate(
  expoPushToken: string,
  activityId: string,
  newState: ContentState,
  options?: {
    alertTitle?: string;
    alertBody?: string;
    playSound?: boolean;
  }
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (!isValidExpoPushToken(expoPushToken)) {
    return { success: false, error: 'Invalid Expo push token' };
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    // Use content-available to wake the app in background
    _contentAvailable: true,
    // Include the Live Activity update data
    data: {
      type: 'live_activity_update',
      activityId,
      state: newState,
      timestamp: Date.now(),
    },
    // Optional visible notification for important updates
    ...(options?.alertTitle && {
      title: options.alertTitle,
      body: options.alertBody,
      sound: options.playSound ? 'default' : undefined,
    }),
    // High priority for timely delivery
    priority: 'high',
    // TTL of 5 minutes for realtime updates
    ttl: 300,
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      // Store ticket ID for later receipt checking
      await storeTicketForReceipt(ticket.id, expoPushToken, activityId);
      return { success: true, ticketId: ticket.id };
    } else {
      // Handle error
      const errorMessage = 'message' in ticket ? ticket.message : 'Unknown error';
      
      // Check for DeviceNotRegistered error
      if ('details' in ticket && ticket.details?.error === 'DeviceNotRegistered') {
        // Token is no longer valid, should be removed
        console.warn(`Device not registered: ${expoPushToken}`);
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send a journey alert notification
 */
export async function sendJourneyAlert(
  expoPushToken: string,
  activityId: string,
  alert: {
    title: string;
    body: string;
    severity: 'info' | 'warning' | 'critical';
  },
  updatedState?: ContentState
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (!isValidExpoPushToken(expoPushToken)) {
    return { success: false, error: 'Invalid Expo push token' };
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    title: alert.title,
    body: alert.body,
    sound: alert.severity === 'critical' ? 'default' : undefined,
    priority: alert.severity === 'critical' ? 'high' : 'default',
    data: {
      type: 'journey_alert',
      activityId,
      severity: alert.severity,
      ...(updatedState && { state: updatedState }),
      timestamp: Date.now(),
    },
    // Critical alerts get immediate interruption on iOS
    ...(alert.severity === 'critical' && {
      _contentAvailable: true,
    }),
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      await storeTicketForReceipt(ticket.id, expoPushToken, activityId);
      return { success: true, ticketId: ticket.id };
    } else {
      const errorMessage = 'message' in ticket ? ticket.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Failed to send journey alert:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send a batch of Live Activity updates efficiently
 */
export async function sendBatchLiveActivityUpdates(
  updates: Array<{
    expoPushToken: string;
    activityId: string;
    state: ContentState;
  }>
): Promise<Array<{ activityId: string; success: boolean; error?: string }>> {
  // Filter valid tokens
  const validUpdates = updates.filter(u => isValidExpoPushToken(u.expoPushToken));
  
  if (validUpdates.length === 0) {
    return updates.map(u => ({ 
      activityId: u.activityId, 
      success: false, 
      error: 'Invalid token' 
    }));
  }

  // Create messages
  const messages: ExpoPushMessage[] = validUpdates.map(update => ({
    to: update.expoPushToken,
    _contentAvailable: true,
    data: {
      type: 'live_activity_update',
      activityId: update.activityId,
      state: update.state,
      timestamp: Date.now(),
    },
    priority: 'high' as const,
    ttl: 300,
  }));

  // Chunk messages (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages);
  const results: Array<{ activityId: string; success: boolean; error?: string }> = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      
      // Map tickets back to activity IDs
      tickets.forEach((ticket, index) => {
        const update = validUpdates[results.length + index];
        if (ticket.status === 'ok') {
          results.push({ activityId: update.activityId, success: true });
          // Store for receipt checking
          storeTicketForReceipt(ticket.id, update.expoPushToken, update.activityId);
        } else {
          const errorMessage = 'message' in ticket ? ticket.message : 'Unknown error';
          results.push({ activityId: update.activityId, success: false, error: errorMessage });
        }
      });
    } catch (error) {
      // Mark remaining updates in this chunk as failed
      const remaining = chunk.length;
      for (let i = 0; i < remaining; i++) {
        const update = validUpdates[results.length];
        if (update) {
          results.push({ 
            activityId: update.activityId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  return results;
}

/**
 * Store a ticket ID for later receipt checking
 */
async function storeTicketForReceipt(
  ticketId: string,
  expoPushToken: string,
  activityId: string
): Promise<void> {
  const data = JSON.stringify({
    ticketId,
    expoPushToken,
    activityId,
    sentAt: Date.now(),
  })
  
  const redis = await getRedis()
  // Store with 24-hour TTL (receipts are cleared after 24 hours)
  await redis.zAdd(PUSH_RECEIPTS_KEY, { score: Date.now(), value: data })
  await redis.expire(PUSH_RECEIPTS_KEY, 86400)
}

/**
 * Check push receipts for previously sent notifications
 * Should be called periodically (e.g., every 15 minutes)
 */
export async function checkPushReceipts(): Promise<{
  checked: number;
  successful: number;
  failed: number;
  deviceNotRegistered: string[];
}> {
  const redis = await getRedis()
  
  // Get tickets older than 15 minutes
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
  const pendingTickets = await redis.zRangeByScore(
    PUSH_RECEIPTS_KEY,
    0,
    fifteenMinutesAgo
  )

  if (pendingTickets.length === 0) {
    return { checked: 0, successful: 0, failed: 0, deviceNotRegistered: [] };
  }

  // Parse ticket data
  const tickets = pendingTickets.map(t => JSON.parse(t) as {
    ticketId: string;
    expoPushToken: string;
    activityId: string;
    sentAt: number;
  });

  const ticketIds = tickets.map(t => t.ticketId);
  
  // Chunk ticket IDs (max 1000 per request)
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
  
  let successful = 0;
  let failed = 0;
  const deviceNotRegistered: string[] = [];

  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      
      for (const [ticketId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'ok') {
          successful++;
        } else {
          failed++;
          
          // Handle specific errors
          if (receipt.details?.error === 'DeviceNotRegistered') {
            const ticket = tickets.find(t => t.ticketId === ticketId);
            if (ticket) {
              deviceNotRegistered.push(ticket.expoPushToken);
            }
          }
          
          console.warn(`Push notification failed: ${ticketId}`, receipt);
        }
      }
    } catch (error) {
      console.error('Failed to fetch push receipts:', error);
    }
  }

  // Remove checked tickets from pending set
  if (pendingTickets.length > 0) {
    await redis.zRem(PUSH_RECEIPTS_KEY, pendingTickets)
  }

  return {
    checked: tickets.length,
    successful,
    failed,
    deviceNotRegistered,
  };
}

/**
 * Send end activity notification
 */
export async function sendLiveActivityEnd(
  expoPushToken: string,
  activityId: string,
  finalState: ContentState,
  message?: { title: string; body: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isValidExpoPushToken(expoPushToken)) {
    return { success: false, error: 'Invalid Expo push token' };
  }

  const pushMessage: ExpoPushMessage = {
    to: expoPushToken,
    _contentAvailable: true,
    data: {
      type: 'live_activity_end',
      activityId,
      state: finalState,
      timestamp: Date.now(),
    },
    ...(message && {
      title: message.title,
      body: message.body,
      sound: 'default',
    }),
    priority: 'high',
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([pushMessage]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      return { success: true };
    } else {
      const errorMessage = 'message' in ticket ? ticket.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Failed to send end activity notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
