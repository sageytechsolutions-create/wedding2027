# Production Monitoring Guide

## Overview

This guide covers the complete observability stack for the AI Real Estate platform, including error tracking, distributed tracing, metrics collection, dashboards, and alerting.

## Architecture

```
Frontend Application          Backend Application
    ↓                              ↓
Sentry SDK                   Sentry SDK
OpenTelemetry SDK            OpenTelemetry SDK
    ↓                              ↓
    └─────────────┬────────────────┘
                  ↓
    Sentry (sentry.io)
    OpenTelemetry Collector (localhost:4317)
    Prometheus (localhost:9090)
    Jaeger (localhost:16686)
                  ↓
    Grafana (localhost:3000)
    Alertmanager (localhost:9093)
                  ↓
    Slack / PagerDuty / Email
```

## Components

### 1. Sentry Error Tracking

**Purpose**: Capture, deduplicate, and analyze errors across frontend and backend.

**Configuration**:
- Frontend DSN: `VITE_SENTRY_DSN`
- Backend DSN: `SENTRY_DSN`
- Environment: Set to `production` or `staging`
- Release: Automatically tracked via CI/CD

**Features**:
- Real-time error capture with stack traces
- Session replay (10% sampling in production)
- Performance monitoring (10% sampling)
- User context tracking
- Breadcrumb trail management
- PII redaction

**Setup**:
```bash
# Create Sentry account at sentry.io
# Create project for both frontend and backend
# Set environment variables with DSNs
export SENTRY_DSN="https://key@sentry.io/project"
export VITE_SENTRY_DSN="https://key@sentry.io/project"
```

### 2. OpenTelemetry Distributed Tracing

**Purpose**: Track requests across services to identify performance bottlenecks.

**Configuration**:
- Collector URL: `http://localhost:4317`
- Service name: `ai-realestate-backend`, `ai-realestate-frontend`
- Sampling rate: 100% development, 10% production

**Features**:
- Automatic instrumentation (HTTP, database, messaging)
- Manual span creation for business operations
- Trace context propagation across services
- Integration with Jaeger for visualization

**Collector Setup**:
```bash
# Start OpenTelemetry Collector
docker run -p 4317:4317 \
  -v ./otel-collector-config.yml:/etc/otel-collector-config.yml \
  otel/opentelemetry-collector-contrib \
  --config=/etc/otel-collector-config.yml
```

### 3. Prometheus Metrics

**Purpose**: Collect and store time-series metrics for performance analysis.

**Key Metrics**:
- Request rate, latency, error rate
- Database query performance
- Cache hit rates
- System resources (CPU, memory, disk)
- Business metrics (properties listed, searches, transactions)

**Configuration**:
- Scrape interval: 15 seconds
- Retention: 30 days
- Targets: Backend (3000), Node Exporter (9100), Redis (9121), Postgres (9187)

**Setup**:
```bash
# Start Prometheus
docker run -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 4. Grafana Dashboards

**Purpose**: Visualize metrics and traces through pre-built dashboards.

**Dashboards**:

1. **System Health** (uid: `system-health`)
   - CPU, memory, disk usage
   - Network I/O
   - Database connection pool saturation

2. **Application Performance** (uid: `app-performance`)
   - Request rate
   - Error rate
   - Latency percentiles (P50, P95, P99)
   - Success rate trends

3. **Business Metrics** (uid: `business-metrics`)
   - Properties listed
   - Search operations
   - Transaction volume
   - Authentication/transaction success rates

4. **Error Tracking** (uid: `error-tracking`)
   - Error rate trends
   - Errors per minute
   - Slow database queries
   - Query latency distribution

5. **Distributed Tracing** (uid: `distributed-tracing`)
   - Trace volume
   - Span duration percentiles
   - Error span rate
   - Traces by type

**Setup**:
```bash
# Start Grafana
docker run -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Access at http://localhost:3000
# Default credentials: admin/admin
```

### 5. Alertmanager

**Purpose**: Route and aggregate alerts to appropriate teams.

**Alert Severity Levels**:
- **Critical**: Service down, availability <99%, error rate >10%
- **Warning**: High latency, low cache hit rate, memory/CPU >80%
- **Info**: High request rate, feature flag changes

**Routing**:
- Critical → PagerDuty (on-call)
- Warning → Slack (#alerts)
- Info → Email

**Configuration**:
```bash
# Set environment variables for integrations
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export PAGERDUTY_SERVICE_KEY="..."
export PAGERDUTY_ONCALL_KEY="..."

# Start Alertmanager
docker run -p 9093:9093 \
  -v ./alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

## Quick Start

### Using Docker Compose

```bash
# Start the entire monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### Service URLs

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | N/A |
| Alertmanager | http://localhost:9093 | N/A |
| Jaeger | http://localhost:16686 | N/A |
| OpenTelemetry Collector | http://localhost:4317 (gRPC) | N/A |

## Integration with Application

### Frontend

```typescript
// Initialize Sentry and OpenTelemetry
import { initializeErrorTracking } from './services/errorTracking';
import { initializeTracing } from './services/tracing';

initializeErrorTracking(isDev);
initializeTracing(isDev);
```

### Backend

```typescript
// Initialize Sentry and OpenTelemetry
import { initializeErrorTracking } from './services/errorTracking';
import { initializeTracing } from './services/tracing';

initializeErrorTracking(isDev);
initializeTracing(isDev);

// Add middleware
app.use(sentryRequestHandler());
app.use(initializeRequestTracking);
```

## Configuration

### Environment Variables

**Frontend (.env)**
```
VITE_SENTRY_DSN=https://key@sentry.io/project
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1.0
VITE_OTEL_ENABLED=true
VITE_OTEL_COLLECTOR_URL=http://localhost:4317
VITE_OTEL_SERVICE_NAME=ai-realestate-frontend
VITE_OTEL_SERVICE_VERSION=1.0.0
```

**Backend (.env)**
```
SENTRY_DSN=https://key@sentry.io/project
OTEL_ENABLED=true
OTEL_COLLECTOR_URL=http://localhost:4317
OTEL_SERVICE_NAME=ai-realestate-backend
OTEL_SERVICE_VERSION=1.0.0
```

## Alert Rules

### Critical Alerts

**ServiceDown**
- Threshold: Service not responding for 1 minute
- Action: Page on-call engineer immediately

**CriticalErrorRate**
- Threshold: Error rate >10% for 2 minutes
- Action: Page on-call engineer

**DatabaseConnectionPoolExhausted**
- Threshold: Connection pool >95% saturated for 2 minutes
- Action: Scale database or kill idle connections

### Warning Alerts

**HighErrorRate**
- Threshold: Error rate >5% for 5 minutes
- Action: Notify app team on Slack

**SlowEndpointLatency**
- Threshold: P95 latency >1 second for 10 minutes
- Action: Notify app team, investigate slow queries

**HighCPUUsage**
- Threshold: CPU >80% for 5 minutes
- Action: Notify ops team

## Runbooks

### Service Down

1. Check service health:
   ```bash
   curl http://localhost:3000/health
   ```

2. View logs:
   ```bash
   docker logs <container-id>
   ```

3. Restart service:
   ```bash
   docker-compose restart <service>
   ```

### High Error Rate

1. Check Sentry dashboard for error patterns
2. Review recent deployments
3. Check database connectivity
4. Verify external service dependencies
5. If necessary, rollback to previous version

### Slow Endpoints

1. Check error tracking dashboard for slow queries
2. Identify bottleneck (database, external service, compute)
3. Optimize query or add caching
4. Scale if necessary

## Sampling Strategy

### Sentry

- **Errors**: 100% (all errors captured)
- **Session Replay**: 10% (production), 100% (development)
- **Performance**: 10% (production), 100% (development)

### OpenTelemetry

- **Development**: 100% of spans
- **Production**: 10% of spans (can be adjusted)

**Rationale**: Sampling reduces network overhead and storage costs while capturing enough data for debugging.

## Retention Policies

| Component | Retention | Notes |
|-----------|-----------|-------|
| Sentry | 90 days | Configurable in Sentry settings |
| Prometheus | 30 days | Can be adjusted in prometheus.yml |
| Jaeger | 72 hours | Can be adjusted in Jaeger config |
| Grafana | Unlimited | Dashboard definitions stored in config |

## Performance Impact

| Component | Memory | CPU | Network |
|-----------|--------|-----|---------|
| Sentry SDK | 2-3MB | <1% | 1KB/error |
| OpenTelemetry SDK | 1-2MB | 1-3% | 100-500B/span |
| Prometheus | 500MB-2GB | 2-5% | 1MB/min |
| Grafana | 200-500MB | <2% | Varies |

## Troubleshooting

### No data showing in Grafana

1. Verify Prometheus is scraping metrics:
   - Go to http://localhost:9090/targets
   - Check that all targets are "UP"

2. Verify datasource connection:
   - Go to Grafana > Data Sources
   - Click Prometheus and test connection

3. Check data retention:
   - Ensure metrics haven't expired from Prometheus

### Alerts not firing

1. Check Alertmanager configuration:
   ```bash
   curl http://localhost:9093/api/v1/alerts
   ```

2. Verify alert rules in Prometheus:
   - Go to http://localhost:9090/alerts

3. Test webhook integration:
   ```bash
   curl -X POST -d @test-alert.json http://localhost:9093/api/v1/alerts
   ```

### High memory usage in Prometheus

1. Reduce scrape interval (increase from 15s to 30s)
2. Reduce retention period (from 30d to 14d)
3. Exclude unnecessary metrics with relabel configs

## Best Practices

1. **Monitoring as Code**: Keep all configuration in version control
2. **Gradual Rollout**: Enable tracing incrementally in production
3. **Regular Reviews**: Review dashboards and alert rules monthly
4. **Team Training**: Ensure team understands alert runbooks
5. **Synthetic Monitoring**: Add periodic health checks
6. **Backup Configuration**: Export dashboards regularly
7. **Documentation**: Keep runbooks and troubleshooting guides updated

## Support & Resources

- **Sentry Docs**: https://docs.sentry.io
- **Prometheus Docs**: https://prometheus.io/docs
- **Grafana Docs**: https://grafana.com/docs
- **OpenTelemetry Docs**: https://opentelemetry.io/docs
- **Jaeger Docs**: https://www.jaegertracing.io/docs

## Next Steps

1. Set up Sentry account and configure DSNs
2. Deploy OpenTelemetry Collector
3. Start monitoring stack with Docker Compose
4. Import Grafana dashboards
5. Configure alert channels (Slack, PagerDuty)
6. Test alert routes with sample alerts
7. Train team on using dashboards and runbooks
