import type { Core } from '@strapi/strapi';

// Reproducibly register the webhook that notifies the rebuild-hook on content
// changes. Runs only when REBUILD_WEBHOOK_URL is set (i.e. the production stack).
// Best-effort: if the webhook store API differs, we log and fall back to manual
// setup (Strapi admin → Settings → Webhooks). Idempotent by webhook name.

interface WebhookInput {
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  enabled: boolean;
}

interface WebhookStore {
  findWebhooks(): Promise<{ name: string }[]>;
  createWebhook(data: WebhookInput): Promise<unknown>;
}

interface WebhookRunner {
  add(webhook: unknown): void;
}

// The webhook store/runner aren't on the public Strapi type; reach them via the
// instance or the DI container without resorting to `any`.
function getWebhookStore(strapi: Core.Strapi): WebhookStore | undefined {
  const s = strapi as unknown as {
    webhookStore?: WebhookStore;
    get?: (name: string) => unknown;
  };
  return s.webhookStore ?? (s.get?.('webhookStore') as WebhookStore | undefined);
}

function getWebhookRunner(strapi: Core.Strapi): WebhookRunner | undefined {
  const s = strapi as unknown as {
    webhookRunner?: WebhookRunner;
    get?: (name: string) => unknown;
  };
  return s.webhookRunner ?? (s.get?.('webhookRunner') as WebhookRunner | undefined);
}

export async function seedRebuildWebhook(strapi: Core.Strapi) {
  const url = process.env.REBUILD_WEBHOOK_URL;
  if (!url) return;
  const secret = process.env.WEBHOOK_SECRET ?? '';

  try {
    const store = getWebhookStore(strapi);
    if (!store) {
      strapi.log.warn('[seed] webhookStore unavailable — configure the rebuild webhook manually');
      return;
    }

    const existing = await store.findWebhooks();
    if (existing?.some((w) => w.name === 'rebuild-hook')) return;

    const created = await store.createWebhook({
      name: 'rebuild-hook',
      url,
      headers: secret ? { 'X-Webhook-Secret': secret } : {},
      events: ['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish'],
      enabled: true,
    });
    // Register with the live runner too — otherwise the webhook only takes
    // effect after the next restart (the runner loads it from the DB on boot).
    getWebhookRunner(strapi)?.add(created);
    strapi.log.info(`[seed] registered rebuild webhook → ${url}`);
  } catch (err) {
    strapi.log.warn(
      `[seed] could not register rebuild webhook (${(err as Error).message}); configure it manually in the admin`,
    );
  }
}
