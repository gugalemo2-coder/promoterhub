/**
 * Hook to register for push notifications and handle incoming notifications.
 * - Requests permission on mount
 * - Registers the Expo push token with the backend
 * - Sets up foreground notification handler
 */

import { trpc } from "@/lib/trpc";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const registerMutation = trpc.pushTokens.register.useMutation();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    // Listen for notifications while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Push] Notification received:", notification.request.content.title);
    });

    // Listen for user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      console.log("[Push] Notification tapped:", data?.type, data?.action);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      // Push notifications only work on physical devices
      return;
    }

    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "PromoterHub",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1A56DB",
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted");
      return;
    }

    // Get Expo push token
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
      const deviceId = Constants.deviceId ?? undefined;

      // Register token with backend
      await registerMutation.mutateAsync({
        token: tokenData.data,
        platform,
        deviceId,
      });

      console.log("[Push] Token registered:", tokenData.data.slice(0, 30) + "...");
    } catch (err) {
      console.warn("[Push] Failed to get/register push token:", err);
    }
  }
}
