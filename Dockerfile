FROM node:22-slim

# Set shell to bash
SHELL ["/bin/bash", "-c"]

# Dependencies install
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

# App part
ENV PATH="/app/node_modules/.bin:${PATH}"

WORKDIR /app

# Install dependencies
COPY yarn.lock package.json ./
RUN yarn install --prod && yarn cache clean

# Copy app files
COPY services/ services/

USER nobody
