#!/bin/bash

# Set Node.js version explicitly
export NODE_VERSION=20.19.0

# Install the correct Node.js version if not available
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2) != $NODE_VERSION ]]; then
    echo "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz | tar -xJ
    export PATH=$(pwd)/node-v$NODE_VERSION-linux-x64/bin:$PATH
fi

# Verify Node.js version
echo "Using Node.js version: $(node -v)"
echo "Using npm version: $(npm -v)"

# Install dependencies and build
npm install
npm run build
