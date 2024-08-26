# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the backend requirements file into the container
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install MongoDB tools
RUN apt-get update && apt-get install -y mongodb-clients

# Copy the backend code into the container
COPY backend/ backend/

# Copy the frontend code into the container
COPY frontend/my-nextjs-chat-app/ frontend/my-nextjs-chat-app/

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm

# Set working directory to frontend
WORKDIR /app/frontend/my-nextjs-chat-app

# Install frontend dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Set working directory back to /app
WORKDIR /app

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV PYTHONUNBUFFERED 1

# Run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]