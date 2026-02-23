# Dockerfile for Multi-Stage Build

FROM python:3.9-slim AS base

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY . .

# Build the final image using a production environment
FROM python:3.9-slim AS production

WORKDIR /app
COPY --from=base /app .

# Command to run the application
CMD ["python", "app.py"]
