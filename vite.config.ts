import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the app is reachable on the LAN
    port: 5173,
    strictPort: true,
    // Allow access via the Tailscale serve HTTPS hostname (and any node on
    // this tailnet). HTTPS here gives a secure context so browser APIs that
    // need one (crypto.randomUUID, getDisplayMedia) work remotely.
    allowedHosts: ['.tail06bac7.ts.net'],
  },
})
