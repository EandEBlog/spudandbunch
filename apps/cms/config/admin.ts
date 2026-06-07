import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
  // "Preview" button for posts → opens the preview service with the shared secret.
  // Enabled in the production stack (PREVIEW_ENABLED=true + PREVIEW_URL set).
  preview: {
    enabled: env.bool('PREVIEW_ENABLED', false),
    config: {
      allowedOrigins: env.array('PREVIEW_ORIGINS', [env('PREVIEW_URL', '')].filter(Boolean)),
      async handler(uid, { documentId }) {
        if (uid !== 'api::post.post') return null;
        const base = env('PREVIEW_URL');
        const secret = env('PREVIEW_SECRET');
        if (!base || !secret) return null;
        return `${base}/preview/${documentId}?secret=${secret}`;
      },
    },
  },
});

export default config;
