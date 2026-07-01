import { precacheAndRoute } from 'workbox-precaching'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

const bgSyncPlugin = new BackgroundSyncPlugin('messages-queue', {
  maxRetentionTime: 24 * 60, // Retry for max 24 Hours
})

registerRoute(
  ({ url }) => url.pathname.endsWith('/rest/v1/messages'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
)
