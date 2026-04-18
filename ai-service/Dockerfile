FROM python:3.11-slim

WORKDIR /app

# Install system deps for lightgbm/xgboost (pre-compiled wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker cache layer)
COPY requirements.txt .

# Install Python deps - use --no-cache-dir to keep image small
# Use pre-compiled wheels only (no building from source = FAST)
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy app code
COPY app/ ./app/

# Expose port (Render sets $PORT at runtime)
EXPOSE 8000

# Start server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
