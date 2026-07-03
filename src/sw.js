import { precacheAndRoute } from 'workbox-precaching'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

// Met en cache tous les assets de l'application au moment du build
precacheAndRoute(self.__WB_MANIFEST)

// L'indexed DB aura comme nom 'messages-queue'
const bgSyncPlugin = new BackgroundSyncPlugin('messages-queue', {
  maxRetentionTime: 24 * 60, // Retry for max 24 Hours
})

//capture le POST qui va a l'url, pour en cas de problème le relancer avec le BackgroundSync défini au dessus.
registerRoute(
  ({ url }) => url.pathname.endsWith('/rest/v1/messages'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
)
