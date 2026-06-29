import { precacheAndRoute } from 'workbox-precaching'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)
