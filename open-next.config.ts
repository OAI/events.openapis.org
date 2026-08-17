import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default config — uses the in-memory cache. If on-demand revalidation / ISR is
// added later, wire up an incremental cache (e.g. R2) here and add the matching
// bindings to wrangler.jsonc. See https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({});
