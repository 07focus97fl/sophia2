# Use an official Node runtime as the base image
FROM node:14 as build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the app
RUN npm run build

# Use an official Python runtime as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install MongoDB
RUN apt-get update && apt-get install -y mongodb

# Copy the requirements file into the container
COPY backend/requirements.txt .

# Install the required packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into the container
COPY backend/ ./backend/

# Copy the built React app
COPY --from=build /app/build ./frontend/build

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Use the entrypoint script to run the application
ENTRYPOINT ["/entrypoint.sh"]