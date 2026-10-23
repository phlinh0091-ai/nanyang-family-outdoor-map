# AMap security-key proxy

This Cloudflare Worker keeps `securityJsCode` on the server side. It only accepts browser requests from the GitHub Pages origin configured in `wrangler.toml`, and only forwards the AMap Web Service (`v3/*`) and custom-style (`v4/map/styles*`) paths.

Before deployment:

1. Set `ALLOWED_ORIGIN` to the exact origin of the Pages site (scheme + hostname, no path).
2. Optionally set `AMAP_JS_API_KEY` to the site's public JS API key; restrict that key to the Pages hostname in the AMap console.
3. Add the security key as a Worker secret named `AMAP_SECURITY_CODE`, for example with `npx wrangler secret put AMAP_SECURITY_CODE`.
4. Deploy with `npx wrangler deploy`, then set the resulting Worker URL ending in `/_AMapService` as `serviceHost` in `site/map-config.js`.

The Worker source is a minimal example and still needs an end-to-end test against the specific AMap services used by this site. Do not deploy it with a blank or unrestricted AMap key, and monitor provider quotas.
