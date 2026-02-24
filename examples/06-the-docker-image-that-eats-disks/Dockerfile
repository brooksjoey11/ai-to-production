FROM ubuntu:22.04

# Install system dependencies in a single layer and clean up cache
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    curl \
    vim \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy application files (use .dockerignore to exclude unnecessary files)
COPY . /app

# Copy model file if present in build context (optional)
COPY model.pkl* ./

# Define build argument for model download URL (optional)
ARG MODEL_URL=""

# Download model if not already copied; fail if neither provided
RUN if [ ! -f model.pkl ] && [ -z "$MODEL_URL" ]; then \
        echo "Error: model.pkl not found in build context and MODEL_URL build argument not set." && exit 1; \
    fi && \
    if [ ! -f model.pkl ] && [ -n "$MODEL_URL" ]; then \
        curl -L -o model.pkl "$MODEL_URL"; \
    fi

# Install Python dependencies from requirements.txt (production only)
RUN pip3 install --no-cache-dir -r requirements.txt

# Command to run the application
CMD ["python3", "app.py"]