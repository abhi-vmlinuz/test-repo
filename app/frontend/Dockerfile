# CTF Platform Frontend - Vite/React
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Cache bust point - change this to force rebuild of code only
ARG CACHEBUST=1

# Copy source code
COPY . .

# Build arguments for environment URLs
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

ARG VITE_CONDUCTOR_URL
ENV VITE_CONDUCTOR_URL=$VITE_CONDUCTOR_URL

# Build the application
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS runner

# Copy custom nginx config template
RUN rm /etc/nginx/conf.d/default.conf

# Accept conductor URL as runtime env for NGINX proxy
ARG VITE_CONDUCTOR_URL
ENV CONDUCTOR_PROXY_URL=${VITE_CONDUCTOR_URL:-http://localhost:8081}

COPY <<'NGINXEOF' /etc/nginx/templates/default.conf.template
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # WebSocket proxy to Conductor (via Cloudflare tunnel)
    # Browser connects same-origin: wss://ctf.zecurx.com/conductor-ws/...
    location /conductor-ws/ {
        proxy_pass ${CONDUCTOR_PROXY_URL}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA routing - try files, fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx (nginx:alpine auto-processes /etc/nginx/templates/*.template with envsubst)
CMD ["nginx", "-g", "daemon off;"]
