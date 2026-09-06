#!/bin/bash

echo "Running devcontainer setup script..."

# Configure gcloud CLI with service account key and project ID
echo "Configuring gcloud..."
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
gcloud config set project $PROJECT_ID

# Install npm dependencies 
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install --verbose
else
  echo "Npm dependencies already installed"
fi

# Add any additional setup commands here
echo "Setup script completed!"
