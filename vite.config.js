import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            },
            manifest: {
                name: 'LPDWCA-Chat',
                short_name: 'LP-Chat',
                description: 'Tchat de la LPDWCA',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'javascript.svg',
                        sizes: '32x32',
                        type: 'image/svg'
                    }
                ]
            }
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
})
