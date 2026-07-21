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

ARG VITE_NEXUS_URL
ENV VITE_NEXUS_URL=$VITE_NEXUS_URL

# Build the application
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS runner

# Copy custom nginx config template
RUN rm /etc/nginx/conf.d/default.conf

# Accept conductor URL as runtime env for NGINX proxy
ARG VITE_CONDUCTOR_URL
ENV CONDUCTOR_PROXY_URL=${VITE_CONDUCTOR_URL:-http://localhost:8081}

COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx (nginx:alpine auto-processes /etc/nginx/templates/*.template with envsubst)
CMD ["nginx", "-g", "daemon off;"]
