#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { load } from '@std/dotenv';
import { NOTIFICATION_TYPES, NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { NOTIFICATION_TYPE_STYLES } from '@/config/notification.ts';

await load({ export: true });

const ticketId = Deno.args[0];
if (!ticketId) {
  console.error('Usage: <ticket-id>');
  Deno.exit(1);
}

const NOTIFICATION_ENDPOINT = 'http://localhost:8080/api/send-notification';

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/health');
    console.log(`Health check response: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
}

async function testNotificationEndpoint(
  ticketId: string,
  notificationType: NotificationType,
): Promise<boolean> {
  const style = NOTIFICATION_TYPE_STYLES[notificationType];
  console.log(`Testing ${notificationType} (${style.color})`);

  try {
    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({ ticketId, notificationType }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        console.log(`✅ ${notificationType} sent`);
        return true;
      } else {
        console.error(
          `❌ ${notificationType} failed: ${result.status} - ${result.message || 'Unknown error'}`,
        );
        return false;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ ${notificationType} failed: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${notificationType} error:`, error);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isHealthy = await checkServerHealth();
if (!isHealthy) {
  console.error('Server not running. Run: deno task start');
  Deno.exit(1);
}

const notificationTypes: NotificationType[] = [
  NOTIFICATION_TYPES.DAY_BEFORE,
  NOTIFICATION_TYPES.HOUR_BEFORE,
  NOTIFICATION_TYPES.MINUTES_BEFORE,
];

let successCount = 0;

for (let i = 0; i < notificationTypes.length; i++) {
  const type = notificationTypes[i];
  const success = await testNotificationEndpoint(ticketId, type);
  if (success) successCount++;

  if (i < notificationTypes.length - 1) {
    await delay(3000);
  }
}

console.log(`Results: ${successCount}/${notificationTypes.length} succeeded`);

if (successCount < notificationTypes.length) {
  Deno.exit(1);
}
