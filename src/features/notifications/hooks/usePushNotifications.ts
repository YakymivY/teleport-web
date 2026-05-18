import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import toast from 'react-hot-toast';
import { saveFcmToken } from '../api/notifications.api';

async function showLocalNotification(filename?: string) {
  const permCheck = await LocalNotifications.checkPermissions();
  if (permCheck.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 2147483647,
        title: 'New file available',
        body: filename ?? 'A file is ready to download',
        channelId: 'file_transfer',
      },
    ],
  });
}

export function usePushNotifications() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    async function setup() {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return;

      await LocalNotifications.createChannel({
        id: 'file_transfer',
        name: 'File transfers',
        importance: 5,
        vibration: true,
      });

      await PushNotifications.register();
    }

    const registrationHandle = PushNotifications.addListener('registration', async (token) => {
      await saveFcmToken(token.value);
    });

    const registrationErrorHandle = PushNotifications.addListener('registrationError', (error) => {
      toast.error('Failed to register for push notifications');
      console.error('Push notification registration error:', error);
    });

    const receivedHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (document.hidden) {
        void showLocalNotification((notification.data as Record<string, string>)?.filename);
      } else {
        toast(notification.title ?? 'New file available for download');
      }
    });

    const actionHandle = PushNotifications.addListener('pushNotificationActionPerformed', () => {
      // App is brought to foreground by the OS; PrivateRoute ensures the user lands on Dashboard.
    });

    void setup();

    return () => {
      void Promise.all([
        registrationHandle.then((h) => h.remove()),
        registrationErrorHandle.then((h) => h.remove()),
        receivedHandle.then((h) => h.remove()),
        actionHandle.then((h) => h.remove()),
      ]);
    };
  }, []);
}
