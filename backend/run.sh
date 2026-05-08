#!/bin/bash

# Sage Backend PM2 Deployment Script
# Run from repo root: ./backend/run.sh <command>

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$BACKEND_DIR")"

cd "$ROOT_DIR"

case "$1" in
  "install")
    echo "Installing PM2 globally..."
    npm install -g pm2
    echo "PM2 installed!"
    ;;
  "build")
    echo "Building Sage backend..."
    cd backend && npm install && npm run build && cd ..
    echo "Building backend complete!"
    ;;
  "start")
    echo "Starting Sage backend with PM2..."
    mkdir -p backend/logs
    pm2 start backend/ecosystem.config.cjs --env production
    pm2 save
    echo "Server started!"
    ;;
  "startup")
    echo "Configuring PM2 to start on boot..."
    pm2 startup
    pm2 save
    echo "PM2 will now start automatically on boot!"
    ;;
  "stop")
    echo "Stopping Sage backend..."
    pm2 stop sage-server
    echo "Server stopped!"
    ;;
  "restart")
    echo "Restarting Sage backend..."
    pm2 restart sage-server
    echo "Server restarted!"
    ;;
  "reload")
    echo "Reloading server (zero-downtime)..."
    pm2 reload sage-server
    echo "Server reloaded!"
    ;;
  "logs")
    pm2 logs sage-server
    ;;
  "monitor")
    pm2 monit
    ;;
  "status")
    pm2 status
    ;;
  "update")
    echo "Updating server..."
    git pull
    cd backend && npm install && npm run build && cd ..
    pm2 reload sage-server
    echo "Update complete!"
    ;;
  "delete")
    echo "Deleting PM2 process..."
    pm2 delete sage-server
    echo "Process deleted!"
    ;;
  *)
    echo "Usage: $0 {install|build|start|startup|stop|restart|reload|logs|monitor|status|update|delete}"
    echo ""
    echo "Commands:"
    echo "  install  - Install PM2 globally"
    echo "  build    - Install deps and build backend"
    echo "  start    - Start server with PM2"
    echo "  startup  - Configure PM2 to start on boot"
    echo "  stop     - Stop server"
    echo "  restart  - Restart server"
    echo "  reload   - Zero-downtime reload"
    echo "  logs     - View server logs"
    echo "  monitor  - Open PM2 monitoring dashboard"
    echo "  status   - Show PM2 status"
    echo "  update   - Pull latest code, build, and reload"
    echo "  delete   - Remove server from PM2"
    exit 1
    ;;
esac
