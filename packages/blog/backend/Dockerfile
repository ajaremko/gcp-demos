FROM ghost:5-alpine

# Install the Google Cloud Storage adapter for Ghost
RUN npm install ghost-google-cloud-storage

# Configure the adapter into the proper Ghost directory structure
RUN mkdir -p content/adapters/storage/gcloud \
    && echo "'use strict'; module.exports = require('ghost-google-cloud-storage');" > content/adapters/storage/gcloud/index.js

EXPOSE 2368
