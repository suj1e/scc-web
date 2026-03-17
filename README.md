# scc-web

Web client for [scc](https://github.com/yourname/scc). React + Vite, deployed via Docker + nginx.

---

## Requirements

- A running [scc](https://github.com/yourname/scc) server reachable from your browser
- Node.js 18+ (for local dev)
- Docker (for deployment)

---

## Local dev

```bash
bash install.sh
npm run dev        # http://localhost:5173
```

---

## Deploy (Docker)

```bash
bash deploy.sh            # builds image, runs on port 3000
PORT=8080 bash deploy.sh  # custom port
```

Or with docker-compose:

```bash
docker compose up -d
```

---

## Behind HTTPS (recommended for public access)

If your domain uses HTTPS, the browser requires `wss://` for WebSocket connections.
Set up a reverse proxy (nginx/Caddy/Traefik) to terminate TLS and forward:

**nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # TLS config here...

    # scc-web static files
    location / {
        proxy_pass http://localhost:3000;
    }

    # scc WebSocket (if scc runs on the same server)
    location /ws {
        proxy_pass         http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 86400;
    }
}
```

Then in the app, connect to `wss://your-domain.com/ws`.

---

## Project structure

```
scc-web/
├── src/
│   ├── main.tsx
│   ├── App.tsx               # root, layout, modals
│   ├── index.css             # Tailwind + prose styles
│   ├── hooks/
│   │   └── useWS.ts          # WebSocket, reconnect, heartbeat
│   ├── store/
│   │   └── index.ts          # Zustand store, persisted to localStorage
│   ├── types/
│   │   ├── protocol.ts       # scc WS message types
│   │   └── app.ts            # app-level types
│   └── components/
│       ├── Sidebar.tsx       # drawer navigation
│       ├── MessageList.tsx   # messages + live stream + tool cards
│       ├── InputBar.tsx      # text input + slash commands
│       ├── GeekStatus.tsx    # latency sparkline + token counts
│       └── Modals.tsx        # Onboarding, NewProject, NewSession
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── deploy.sh
└── install.sh
```

---

## Related

- [scc](https://github.com/yourname/scc) — the WebSocket server
- [scc-ios](https://github.com/yourname/scc-ios) — the iOS client
