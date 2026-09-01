#!/bin/bash

# AI Real Estate Investment Platform - Production Deployment Script
# Automates staging and production deployment with blue-green switching

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-sageytechsolutions-create/wedding2027}"
ENVIRONMENT="${1:-staging}"
DRY_RUN="${DRY_RUN:-false}"

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

# Validate environment
validate_environment() {
  print_header "Validating Environment"

  log_info "Checking required tools..."
  command -v docker &> /dev/null || { log_error "Docker not found"; exit 1; }
  command -v docker-compose &> /dev/null || { log_error "Docker Compose not found"; exit 1; }
  command -v git &> /dev/null || { log_error "Git not found"; exit 1; }

  log_success "All required tools found"

  log_info "Verifying Docker daemon..."
  docker ps > /dev/null 2>&1 || { log_error "Docker daemon not running"; exit 1; }

  log_success "Docker daemon is running"
}

# Build Docker images
build_images() {
  print_header "Building Docker Images"

  if [ "$DRY_RUN" = "true" ]; then
    log_warning "DRY RUN: Skipping image build"
    return
  fi

  log_info "Building backend image..."
  docker build \
    -f "$PROJECT_ROOT/Dockerfile.backend" \
    -t "$REGISTRY/$IMAGE_NAME/backend:latest" \
    -t "$REGISTRY/$IMAGE_NAME/backend:$(git rev-parse --short HEAD)" \
    "$PROJECT_ROOT" || { log_error "Backend build failed"; exit 1; }

  log_success "Backend image built successfully"

  log_info "Building frontend image..."
  docker build \
    -f "$PROJECT_ROOT/Dockerfile.frontend" \
    -t "$REGISTRY/$IMAGE_NAME/frontend:latest" \
    -t "$REGISTRY/$IMAGE_NAME/frontend:$(git rev-parse --short HEAD)" \
    "$PROJECT_ROOT" || { log_error "Frontend build failed"; exit 1; }

  log_success "Frontend image built successfully"
}

# Deploy to staging
deploy_staging() {
  print_header "Deploying to Staging"

  if [ "$DRY_RUN" = "true" ]; then
    log_warning "DRY RUN: Would deploy to staging"
    return
  fi

  cd "$PROJECT_ROOT"

  log_info "Starting staging services..."
  docker-compose -f docker-compose.yml up -d

  log_info "Waiting for services to be healthy..."
  sleep 20

  log_info "Checking backend health..."
  curl -f http://localhost:3000/health || { log_error "Backend health check failed"; exit 1; }

  log_success "Backend is healthy"

  log_info "Checking frontend health..."
  curl -f http://localhost:3001/ || { log_error "Frontend health check failed"; exit 1; }

  log_success "Frontend is healthy"

  log_success "Staging deployment completed successfully"
}

# Deploy to production (blue-green)
deploy_production() {
  print_header "Deploying to Production (Blue-Green)"

  if [ "$DRY_RUN" = "true" ]; then
    log_warning "DRY RUN: Would deploy to production"
    return
  fi

  cd "$PROJECT_ROOT"

  log_info "Current deployment status:"
  docker-compose -f docker-compose.production.yml ps || true

  log_info "Starting green environment (new version)..."
  docker-compose -f docker-compose.production.yml --profile green up -d

  log_info "Waiting for green environment to be healthy..."
  for i in {1..30}; do
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
      log_success "Green backend is healthy"
      break
    fi
    if [ $i -eq 30 ]; then
      log_error "Green environment failed to become healthy"
      exit 1
    fi
    log_info "Waiting... ($i/30)"
    sleep 10
  done

  log_info "Waiting for frontend green environment..."
  for i in {1..30}; do
    if curl -f http://localhost:3004/ > /dev/null 2>&1; then
      log_success "Green frontend is healthy"
      break
    fi
    if [ $i -eq 30 ]; then
      log_error "Green frontend failed to become healthy"
      exit 1
    fi
    log_info "Waiting... ($i/30)"
    sleep 10
  done

  log_warning "🟡 Ready to switch traffic to green environment"
  echo ""
  echo -e "Execute the following command to complete the switch:"
  echo -e "${YELLOW}docker exec nginx-lb nginx -s reload${NC}"
  echo ""
  echo -e "To rollback to blue, run:"
  echo -e "${YELLOW}docker-compose -f docker-compose.production.yml --profile green down${NC}"
  echo ""

  read -p "Continue with traffic switch? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Switching traffic to green environment..."
    docker exec nginx-lb nginx -s reload || true
    sleep 5
    log_success "Traffic switched to green environment"
  else
    log_warning "Deployment paused. Green environment is ready but traffic not switched."
  fi
}

# Run smoke tests
run_smoke_tests() {
  print_header "Running Smoke Tests"

  if [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="http://localhost:3000"
  else
    BASE_URL="http://localhost:3002"
  fi

  log_info "Testing API health endpoint..."
  curl -f "$BASE_URL/health" > /dev/null || { log_error "API health check failed"; exit 1; }
  log_success "API is healthy"

  log_info "All smoke tests passed"
}

# Print deployment summary
print_summary() {
  print_header "Deployment Summary"

  echo ""
  echo -e "${GREEN}✅ Deployment Completed Successfully${NC}"
  echo ""
  echo "Environment: $ENVIRONMENT"
  echo "Timestamp: $(date)"
  echo ""

  if [ "$ENVIRONMENT" = "staging" ]; then
    echo "Staging URLs:"
    echo "  Frontend: http://localhost:3001"
    echo "  Backend:  http://localhost:3000"
  else
    echo "Production URLs:"
    echo "  Blue (current):  http://localhost:3001 (backend: 3000)"
    echo "  Green (new):     http://localhost:3004 (backend: 3002)"
    echo "  Load Balancer:   http://localhost:80"
  fi

  echo ""
  log_info "Check logs with: docker-compose -f docker-compose.production.yml logs -f"
}

# Main execution
main() {
  echo ""
  log_info "Starting deployment script"
  log_info "Environment: $ENVIRONMENT"
  log_info "DRY_RUN: $DRY_RUN"
  echo ""

  case "$ENVIRONMENT" in
    staging)
      validate_environment
      build_images
      deploy_staging
      run_smoke_tests
      print_summary
      ;;
    production)
      validate_environment
      build_images
      deploy_production
      run_smoke_tests
      print_summary
      ;;
    *)
      log_error "Invalid environment: $ENVIRONMENT"
      log_info "Usage: $0 {staging|production}"
      exit 1
      ;;
  esac
}

# Execute
main "$@"
