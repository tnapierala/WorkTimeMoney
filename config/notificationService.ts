import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Request notification permissions and register the user's device push token in Firestore.
 */
export async function registerForPushNotificationsAsync(userId: string) {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the EAS project ID if it exists in the expoConfig
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {}),
    });

    const token = tokenData.data;

    if (token && userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { pushToken: token });
      //console.log('Successfully saved push token for user:', userId, token);
    }

    return token;
  } catch (error) {
    console.warn('Error during push token registration (remote notifications may not be supported in this environment):', error);
    return null;
  }
}

/**
 * Send a push notification request directly to the Expo Push API.
 */
export async function sendPushNotification(targetPushToken: string, title: string, body: string, data?: Record<string, any>) {
  if (!targetPushToken) return;

  const message = {
    to: targetPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const resData = await response.json();
    console.log('Push notification response:', resData);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Fetch a user's push token from Firestore and send them a push notification.
 */
export async function notifyUser(userId: string, title: string, body: string, data?: Record<string, any>) {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const pushToken = userSnap.data().pushToken;
      if (pushToken) {
        await sendPushNotification(pushToken, title, body, data);
      } else {
        console.log('User does not have a push token:', userId);
      }
    }
  } catch (error) {
    console.error('Error sending notification to user:', userId, error);
  }
}
