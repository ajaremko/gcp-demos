#!/bin/bash

# This script is used to set up the environment for releasing docker images to the staging stack. 
# It retrieves necessary configuration from Pulumi, sets environment variables, and configures 
# Docker authentication for GCP.

# Usage: source ./release-hotfix.sh 

STACK_NAME=staging

# Access the Pulumi stack and retrieve the GCP project ID and Docker registry information

echo "Preparing to release $STACK_NAME images..."

cd packages/shared/infra

OUT="$(pulumi stack output --json --stack=$STACK_NAME)"

RELEASE_PROJECT="$(echo "$OUT" | jq -r '.gcpProject')"
DOCKER_REGISTRY="$(echo "$OUT" | jq -r '.artifactRegistryUri')"
DOCKER_REGISTRY_BASE="$(echo "$OUT" | jq -r '.artifactRegistryBaseUri')"

# Set environment variables for the release process to access and configure docker 
# authentication for gcloud

echo "Setting $STACK_NAME env vars..."

export RELEASE_PROJECT=$RELEASE_PROJECT
export DOCKER_REGISTRY=$DOCKER_REGISTRY
export DOCKER_REGISTRY_BASE=$DOCKER_REGISTRY_BASE

echo RELEASE_PROJECT=$RELEASE_PROJECT
echo DOCKER_REGISTRY=$DOCKER_REGISTRY
echo DOCKER_REGISTRY_BASE=$DOCKER_REGISTRY_BASE

# Configure docker authentication for the artifact registry.

echo "Configuring docker auth for gcloud..."

gcloud auth configure-docker $DOCKER_REGISTRY_BASE --quiet
