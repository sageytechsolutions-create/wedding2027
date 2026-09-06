#!/bin/bash

# Wedding2027 Demo Setup Script
# Run this on your local machine to set up the demo environment
# Usage: bash setup-demo.sh

set -e  # Exit on error

echo "🚀 Wedding2027 Demo Setup"
echo "========================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null && ! command -v podman &> /dev/null; then
    echo -e "${RED}❌ Error: Docker or Podman not found${NC}"
    echo "Please install Docker Desktop or Podman first"
    exit 1
fi

# Determine which container tool to use
if command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✓ Docker found${NC}"
else
    CONTAINER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    echo -e "${GREEN}✓ Podman found${NC}"
fi

# Check if in correct directory
if [ ! -f "docker-compose.staging.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.staging.yml not found${NC}"
    echo "Make sure you're in the wedding2027 directory"
    exit 1
fi

echo -e "${GREEN}✓ Project directory verified${NC}"
echo ""

# Step 1: Stop any existing services
echo "🛑 Stopping any existing services..."
$COMPOSE_CMD -f docker-compose.staging.yml down 2>/dev/null || true
echo -e "${GREEN}✓ Ready for fresh start${NC}"
echo ""

# Step 2: Start services
echo "🚀 Starting services..."
$COMPOSE_CMD -f docker-compose.staging.yml up -d
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Step 3: Verify services
echo "✅ Checking service status..."
RUNNING=$($CONTAINER_CMD ps --format "table {{.Names}}\t{{.Status}}" | grep -c "Up" || true)
echo "Services running: $RUNNING/5"

if [ $RUNNING -lt 5 ]; then
    echo -e "${YELLOW}⚠️  Not all services are running yet. Waiting 30 more seconds...${NC}"
    sleep 30
fi

# Step 4: Create demo accounts
echo ""
echo "👤 Creating demo accounts..."

# Account 1
echo "  Creating demo@wedding2027.app..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@wedding2027.app",
    "password": "Demo123!",
    "name": "Demo Client"
  }' > /dev/null 2>&1
echo -e "  ${GREEN}✓ Account 1 created${NC}"

# Account 2
echo "  Creating investor@wedding2027.app..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investor@wedding2027.app",
    "password": "Demo123!",
    "name": "Sample Investor"
  }' > /dev/null 2>&1
echo -e "  ${GREEN}✓ Account 2 created${NC}"

# Account 3
echo "  Creating portfolio@wedding2027.app..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "portfolio@wedding2027.app",
    "password": "Demo123!",
    "name": "Portfolio Manager"
  }' > /dev/null 2>&1
echo -e "  ${GREEN}✓ Account 3 created${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DEMO SETUP COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📱 Access the demo at: http://localhost:3001"
echo ""
echo "🔐 Login credentials:"
echo "  Email:    demo@wedding2027.app"
echo "  Password: Demo123!"
echo ""
echo "💡 Backup accounts:"
echo "  investor@wedding2027.app / Demo123!"
echo "  portfolio@wedding2027.app / Demo123!"
echo ""
echo "📋 Verify these pages load:"
echo "  ✓ Dashboard"
echo "  ✓ Properties (search & filter)"
echo "  ✓ Portfolio"
echo "  ✓ Transactions"
echo "  ✓ Analytics"
echo ""
echo "🚀 Ready to demo!"
echo ""
echo "Tip: Run 'docker ps' (or 'podman ps') to see all services running"
echo ""
