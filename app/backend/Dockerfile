# CTF Platform Backend - FastAPI/Python with Docker support
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Docker CLI, Git, and fonts for OG images
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    ca-certificates \
    gnupg \
    git \
    fonts-dejavu-core \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*



# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
ARG CACHEBUST=1
# Copy application code
COPY . .

# Note: Running as root to access Docker socket
# In production with Docker socket mounted, this is required

# Create OG image cache directory
RUN mkdir -p /app/og-cache/categories

# Expose port (FastAPI runs on 4000 in production)
EXPOSE 4000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4000/api/health')" || exit 1

# Start with Uvicorn (production server)
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "4000"]
