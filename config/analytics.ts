import { POSTHOG_API_KEY, POSTHOG_HOST } from './appConfig';

let distinctId = 'anonymous';

export function setPostHogUser(userId: string) {
  distinctId = userId;
}

export function capture(event: string, properties?: Record<string, any>) {
  try {
    fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        properties: { distinct_id: distinctId, ...properties },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {}
}
