import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { savePushToken } from '@/services/push-token-registry';

export type PushPermissionState = 'checking' | 'unsupported' | 'denied' | 'enabled';

export async function ensureWebAppServiceWorker() {
  return null;
}

export function getPushSetupHint() {
  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('noi-vong-tay', {
    name: 'Nối Vòng Tay',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#2F9B62',
    sound: 'default',
  });
}

async function register(permissionCanPrompt: boolean): Promise<PushPermissionState> {
  if (!Device.isDevice) return 'unsupported';
  await ensureAndroidChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted' && permissionCanPrompt) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return 'denied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'unsupported';

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await savePushToken({
    token,
    provider: 'expo',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  return 'enabled';
}

export async function registerPushNotifications() {
  return register(true);
}

export async function restorePushNotifications() {
  return register(false);
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  // A granted OS permission alone does not mean push is operational.
  // Only report "enabled" after Expo/FCM returned a token and it was
  // successfully stored for the signed-in Firebase account.
  return register(false);
}

export function subscribeForegroundPush() {
  return () => undefined;
}

export function subscribePushResponses(listener: (path: string) => void) {
  const open = (data: Record<string, unknown> | undefined) => {
    const path = data?.path;
    if (typeof path === 'string' && path.startsWith('/')) listener(path);
  };

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) open(response.notification.request.content.data);
  });
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    open(response.notification.request.content.data);
  });
  return () => subscription.remove();
}
