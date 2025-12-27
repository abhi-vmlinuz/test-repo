# CTF Platform Backend - FastAPI/Python
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

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
