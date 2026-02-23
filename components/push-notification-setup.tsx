/**
 * PushNotificationSetup
 * Renders nothing but registers for push notifications when the user is authenticated.
 * Place this inside the authenticated area (after login) so the tRPC mutation works.
 */

import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationSetup() {
  const { user } = useAuth();

  // Only register when user is authenticated
  if (user) {
    return <PushNotificationSetupInner />;
  }
  return null;
}

function PushNotificationSetupInner() {
  usePushNotifications();
  return null;
}
