#!/bin/bash
set -e

echo "Installing root dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Installing backend dependencies..."
cd backend
npm install

echo "Build complete!"
