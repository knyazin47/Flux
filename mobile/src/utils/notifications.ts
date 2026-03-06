// Smart activity-based notifications (Duolingo-style).
// Schedule reminders only when the daily goal has NOT been met.
// Call refreshNotifications() on every app foreground + after goal completion.

import * as Notifications from "expo-notifications";

const SLOTS = [
  { hour: 12, minute: 0, body: "Пора заняться физикой! Выполни дневное задание." },
  { hour: 19, minute: 0, body: "Ещё не сделал задания? Самое время позаниматься!" },
  { hour: 22, minute: 0, body: "Последний шанс! Не потеряй серию." },
];

/**
 * Reschedule (or cancel) daily reminder notifications.
 *
 * @param enabled  - user has notifications turned on
 * @param goalMet  - user already completed today's daily goal
 *
 * Call this:
 *  - once on app mount (AppInner useEffect)
 *  - every time the app returns to the foreground (AppState "active")
 *  - immediately after the daily goal is reached (Tasks screen)
 */
export async function refreshNotifications(
  enabled: boolean,
  goalMet: boolean
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled || goalMet) return;

    for (const slot of SLOTS) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Flux",
          body: slot.body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      });
    }
  } catch (e) {
    console.warn("refreshNotifications:", e);
  }
}

/**
 * Request permission and enable smart notifications.
 * Returns true if permission was granted.
 */
export async function enableNotifications(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}
