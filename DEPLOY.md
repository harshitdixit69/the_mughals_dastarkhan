Deployment guide — Docker + Compose

Overview
- This repo contains a FastAPI backend and a React frontend. The compose setup builds the backend and frontend images and serves the frontend with nginx.

Prerequisites on server
- Docker installed (Docker Engine)
- docker-compose (or use `docker compose` bundled)
- Open ports: 80 (HTTP), 8000 (optional)

Steps
1. Copy repository to server (git clone or scp)
2. Create/verify env file: `backend/.env` — set at minimum:

RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
MONGO_URL=... (optional)
JWT_SECRET=... (production secret)

3. Build and start using docker-compose:

```bash
cd /path/to/the-mughals-dastarkhan-main
docker compose build --pull
docker compose up -d
```

4. Verify services:
- Frontend: http://SERVER_IP/
- Backend: http://SERVER_IP:8000/docs

Notes & next steps
- Use Let’s Encrypt or a reverse proxy for HTTPS (nginx/caddy/traefik). If you prefer, I can add a production-ready reverse-proxy compose stack.
- For high availability and process management you can use systemd unit to manage `docker compose` or use Docker Swarm / Kubernetes.
- Replace `REACT_APP_BACKEND_URL` env in `docker-compose.yml` with your public backend URL when using a public domain.

Security
- Never commit `backend/.env` to source control with production keys
- Use Docker secrets or environment variable management in your hosting provider for production secrets

Troubleshooting
- View logs: `docker compose logs -f backend` or `docker compose logs -f frontend`
- Rebuild images after code changes: `docker compose build frontend backend && docker compose up -d`
