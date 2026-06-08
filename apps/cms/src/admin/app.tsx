import type { StrapiApp } from '@strapi/strapi/admin';
import { useEffect } from 'react';

// The public site URL. Baked at admin build time from STRAPI_ADMIN_LIVE_URL
// (Strapi exposes STRAPI_ADMIN_* vars to the admin build); defaults to the local
// production stack.
const LIVE_URL = process.env.STRAPI_ADMIN_LIVE_URL || 'http://localhost:8080';

// Opens the live site in a new tab (with a visible fallback link).
const LiveSite = () => {
  useEffect(() => {
    window.open(LIVE_URL, '_blank', 'noopener,noreferrer');
  }, []);
  return (
    <div style={{ padding: '3rem' }}>
      <h1>Live site</h1>
      <p>
        Opening <a href={LIVE_URL} target="_blank" rel="noopener noreferrer">{LIVE_URL}</a> in a new
        tab… if it didn’t open, click the link.
      </p>
    </div>
  );
};

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: '/live-site',
      icon: () => <span aria-hidden="true">🌐</span>,
      intlLabel: { id: 'live-site.menu', defaultMessage: 'View live site' },
      Component: () => <LiveSite />,
    });
  },
};
