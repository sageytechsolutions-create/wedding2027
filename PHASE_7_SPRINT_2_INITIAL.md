# Phase 7 Sprint 2: Production Monitoring Infrastructure - Initial Setup

**Status**: 🚀 Infrastructure Scaffolding Starting  
**Date**: September 1, 2026  
**Sprint Duration**: 1 week (in progress)

---

## Overview

Phase 7 Sprint 2 focuses on establishing production monitoring and observability infrastructure, enabling real-time error tracking, distributed tracing, and performance monitoring across the platform. This includes Sentry for error tracking, OpenTelemetry for distributed tracing, and Prometheus/Grafana for metrics collection.

**Goal**: Move from development-only testing to production-grade observability, catching issues in production before users are impacted, and providing deep insights into system performance.

---

## Architecture Overview

### Observability Stack

```
Application Layer (Frontend + Backend)
    ↓
Error Tracking Layer (Sentry)
    • Captures errors and exceptions
    • Session replay
    • Performance monitoring
    • Release tracking
    
Performance Tracing (OpenTelemetry)
    • Distributed tracing across services
    • Span collection and analysis
    • Service dependency mapping
    • Latency analysis
    
Metrics Collection (Prometheus)
    • System metrics (CPU, memory, disk)
    • Application metrics (requests, latency, errors)
    • Custom business metrics
    
Visualization & Alerting (Grafana + PagerDuty)
    • Real-time dashboards
    • Custom alerts
    • On-call notifications
    • Trend analysis
```

---

## Sprint 2 Deliverables (Planned)

### 1. Sentry Integration (Frontend + Backend)
**Status**: 📋 Planned

#### Frontend Integration
- Sentry SDK installation and configuration
- Error boundary component for React
- User context and session tracking
- Performance monitoring integration
- Release tracking
- Source map upload configuration

**Files to Create**:
- `src/frontend/src/services/errorTracking.ts` (150 lines)
- `src/frontend/src/components/ErrorBoundary.tsx` (100 lines)
- Sentry configuration in environment

#### Backend Integration
- Sentry SDK for Node.js
- Error middleware integration
- Request/response logging
- Database query monitoring
- Custom error handlers

**Files to Create**:
- `src/backend/src/services/errorTracking.ts` (150 lines)
- `src/backend/src/middleware/sentryMiddleware.ts` (100 lines)

### 2. OpenTelemetry Setup (Frontend + Backend)
**Status**: 📋 Planned

#### Frontend Tracing
- OpenTelemetry SDK setup
- React instrumentation
- HTTP client tracing
- User interaction tracing
- Custom span creation

**Files to Create**:
- `src/frontend/src/services/tracing.ts` (200 lines)
- `src/frontend/src/instrumentation/index.ts` (150 lines)

#### Backend Tracing
- OpenTelemetry Node.js SDK
- Express middleware integration
- Database query tracing
- External API call tracing
- Trace context propagation

**Files to Create**:
- `src/backend/src/services/tracing.ts` (200 lines)
- `src/backend/src/instrumentation/index.ts` (150 lines)
- `src/backend/src/middleware/tracingMiddleware.ts` (100 lines)

### 3. Metrics Collection (Prometheus)
**Status**: 📋 Planned

#### Prometheus Configuration
- Prometheus scrape configuration
- Service discovery setup
- Metric retention policies
- Recording rules for common aggregations

**Files to Create**:
- `monitoring/prometheus.yml` (80 lines)
- `monitoring/recording-rules.yml` (100 lines)
- Backend metrics middleware (120 lines)

#### Custom Metrics
- Request latency histogram
- Error rate counter
- Active user gauge
- Property search count
- Authentication success/failure rate
- API response time by endpoint

### 4. Grafana Dashboards
**Status**: 📋 Planned

#### Dashboard Templates
- System Health Dashboard (CPU, memory, disk, network)
- Application Performance Dashboard (request rates, latencies, errors)
- Business Metrics Dashboard (users, transactions, properties)
- Error Tracking Dashboard (error rates, top errors, trends)
- Distributed Tracing Dashboard (trace analysis, service latency)

**Files to Create**:
- `monitoring/grafana/dashboards/system-health.json` (150 lines)
- `monitoring/grafana/dashboards/app-performance.json` (150 lines)
- `monitoring/grafana/dashboards/business-metrics.json` (120 lines)
- `monitoring/grafana/dashboards/error-tracking.json` (130 lines)
- `monitoring/grafana/dashboards/distributed-tracing.json` (140 lines)

### 5. Alerting Rules & Notifications
**Status**: 📋 Planned

#### Alert Rules
- High error rate alert (>5% errors)
- API latency alert (>2s p95)
- Service down alert
- Database connection pool exhaustion
- Memory usage alert (>80%)
- Disk space alert (>90%)

**Files to Create**:
- `monitoring/alerting-rules.yml` (120 lines)
- `src/backend/src/services/alerting.ts` (100 lines)

#### Notification Integration
- PagerDuty integration for critical alerts
- Slack integration for warnings
- Email notifications for daily/weekly reports
- On-call rotation management

### 6. Documentation
**Status**: 📋 Planned

**Files to Create**:
- `PRODUCTION_MONITORING.md` (500+ lines) - Complete setup and usage guide
- `OBSERVABILITY_GUIDE.md` (300+ lines) - How to add observability to new features
- `ALERTING_PROCEDURES.md` (200+ lines) - Alert response and escalation procedures

### 7. CI/CD Integration
**Status**: 📋 Planned

#### GitHub Actions Workflow
- Deploy Sentry Release on every production deployment
- Upload source maps to Sentry
- Validate Prometheus scrape config
- Deploy Grafana dashboards
- Test alert rules

**Files to Create**:
- `.github/workflows/monitoring-deploy.yml` (150 lines)

---

## Technology Stack Selection

### Error Tracking
**Sentry** (Chosen)
- ✅ Self-hosted and SaaS options
- ✅ Full stack error tracking
- ✅ Session replay
- ✅ Performance monitoring
- ✅ Release tracking
- ✅ Excellent React integration

### Distributed Tracing
**OpenTelemetry** (Chosen)
- ✅ Vendor-agnostic standard
- ✅ Excellent Node.js and React support
- ✅ Built-in instrumentation packages
- ✅ Context propagation
- ✅ Flexible export options

### Metrics Collection
**Prometheus** (Chosen)
- ✅ Industry standard
- ✅ Time-series database
- ✅ Flexible query language (PromQL)
- ✅ Built-in alerting
- ✅ Excellent ecosystem

### Visualization
**Grafana** (Chosen)
- ✅ Industry standard dashboarding
- ✅ Prometheus native support
- ✅ Alerting integration
- ✅ JSON-based dashboard definitions
- ✅ Multi-source support (Prometheus, Loki, Jaeger)

### Alerting
**PagerDuty + Slack** (Chosen)
- ✅ PagerDuty: On-call management, incident tracking
- ✅ Slack: Real-time notifications, audit trail
- ✅ Email: Important alerts, daily/weekly summaries

---

## Implementation Plan

### Week 1 Phase 7 Sprint 2 Breakdown

**Days 1-2: Sentry Setup**
- Frontend Sentry integration (error boundary, session tracking)
- Backend Sentry integration (middleware, error handlers)
- Release and source map configuration
- Basic error tracking validation

**Days 2-3: OpenTelemetry Setup**
- Frontend tracing configuration (React instrumentation)
- Backend tracing configuration (Express middleware)
- Trace export setup (Jaeger collector)
- Context propagation validation

**Days 3-4: Prometheus & Metrics**
- Prometheus scrape configuration
- Backend metrics middleware
- Custom application metrics
- Grafana data source setup

**Days 4-5: Dashboards & Alerting**
- Grafana dashboard creation (5 dashboards)
- Alert rules configuration
- PagerDuty and Slack integration
- Documentation and runbooks

---

## Success Criteria (Phase 7 Sprint 2)

### Must Have ✅
- [ ] Sentry integrated on frontend and backend
- [ ] Error tracking capturing errors in production
- [ ] OpenTelemetry tracing configured
- [ ] Basic distributed tracing working
- [ ] Prometheus metrics collection
- [ ] Grafana dashboards visualizing metrics
- [ ] Basic alerting rules configured

### Should Have ⏳
- [ ] Session replay in Sentry
- [ ] Performance monitoring baseline
- [ ] Release tracking with Sentry
- [ ] Custom business metrics
- [ ] Alert routing (PagerDuty/Slack)

### Nice to Have 📋
- [ ] Custom Grafana dashboard templates
- [ ] Automated runbook generation
- [ ] Anomaly detection
- [ ] Cost optimization tracking

---

## Expected Output

### Lines of Code
- Sentry integration: ~600 lines (frontend + backend)
- OpenTelemetry setup: ~700 lines (frontend + backend)
- Metrics and dashboards: ~1,000 lines (config + JSON)
- Documentation: ~1,000 lines
- **Total: ~3,300 lines**

### Configuration Files
- `sentry.config.ts` (frontend) - 100 lines
- `sentry.config.ts` (backend) - 100 lines
- `tracing.config.ts` (frontend) - 150 lines
- `tracing.config.ts` (backend) - 150 lines
- `prometheus.yml` - 80 lines
- `alerting-rules.yml` - 120 lines
- Grafana dashboards - ~700 lines JSON

### Deliverables
✅ Fully integrated error tracking  
✅ Distributed tracing infrastructure  
✅ Metrics collection pipeline  
✅ Real-time dashboards  
✅ Alert configuration  
✅ Complete documentation  

---

## Dependencies & Requirements

### Sentry Setup (User Action)
- [ ] Create Sentry account (sentry.io)
- [ ] Create projects for frontend and backend
- [ ] Generate DSNs
- [ ] Configure organization and teams

### Monitoring Stack Deployment
- [ ] Docker/Kubernetes resources for Prometheus
- [ ] Grafana instance (cloud or self-hosted)
- [ ] PagerDuty account (optional, can use Slack only)
- [ ] Jaeger instance for trace storage (optional)

### NPM Packages (Auto-installed)
```
Frontend:
- @sentry/react
- @sentry/tracing
- @opentelemetry/api
- @opentelemetry/sdk-web
- @opentelemetry/auto-instrumentations-web

Backend:
- @sentry/node
- @sentry/tracing
- @opentelemetry/api
- @opentelemetry/sdk-node
- @opentelemetry/auto-instrumentations-node
- prom-client
```

---

## Known Considerations

### Performance Impact
- Sentry error tracking has minimal overhead (<5ms per error)
- OpenTelemetry tracing can add 1-3% performance overhead
- Can be tuned with sampling strategies

### Privacy & Compliance
- PII redaction in Sentry (email, passwords, API keys)
- GDPR-compliant data retention
- Self-hosted option for sensitive deployments
- Personally identifiable information filtering

### Cost Optimization
- Sentry pricing: Pay-as-you-go ($0.50 per error after free tier)
- Prometheus: Self-hosted, minimal infrastructure cost
- Grafana: Free tier available, SaaS option available
- Can be optimized with sampling and filtering

---

## Connection to Phase 7 Roadmap

### Phase 7 Sprint 1 → Sprint 2
- **Sprint 1**: Real device testing (testing on actual hardware)
- **Sprint 2**: Production monitoring (observing real production environment)
- **Sprint 3**: Safe deployments (canary deployments with monitoring)
- **Sprint 4**: Analytics (data-driven improvements)

### Why This Order
1. First validate functionality (Phase 6 E2E + Phase 7 Sprint 1 real devices)
2. Then monitor production (Phase 7 Sprint 2 - this sprint)
3. Then deploy safely (Phase 7 Sprint 3 with Sprint 2 monitoring in place)
4. Then analyze impact (Phase 7 Sprint 4)

---

## Next Steps (Starting Phase 7 Sprint 2)

### Immediate (Today)
1. ✅ Create Sprint 2 planning document (this file)
2. 🚀 Begin Sentry integration (frontend)
3. 🚀 Begin OpenTelemetry setup (frontend)

### This Week (Days 2-3)
1. Complete Sentry integration (frontend + backend)
2. Complete OpenTelemetry setup (frontend + backend)
3. Configure Prometheus scraping
4. Create Grafana dashboards

### End of Week (Days 4-5)
1. Configure alerting rules
2. Test PagerDuty/Slack integration
3. Create documentation
4. Validation and testing

---

## Resources

### Documentation (To Create)
- `PRODUCTION_MONITORING.md` - Complete setup guide
- `OBSERVABILITY_GUIDE.md` - How to instrument code
- `ALERTING_PROCEDURES.md` - Alert response procedures

### External Resources
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

## Estimated Timeline

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| Sentry Integration | 1-2 days | Claude | 🚀 Starting |
| OpenTelemetry Setup | 1-2 days | Claude | 🚀 Starting |
| Prometheus Config | 0.5 day | Claude | ⏳ Pending |
| Grafana Dashboards | 1 day | Claude | ⏳ Pending |
| Alerting Rules | 0.5 day | Claude | ⏳ Pending |
| Documentation | 1 day | Claude | ⏳ Pending |
| **Sprint 2 Total** | **~5-6 days** | - | **🚀 In Progress** |

---

## Summary

Phase 7 Sprint 2 will establish production-grade observability for the AI Real Estate Investment Platform. By the end of this sprint:

✅ All errors captured in real-time with full context  
✅ Distributed tracing enabled for performance analysis  
✅ Metrics collected and visualized in Grafana  
✅ Automated alerting for critical issues  
✅ Complete documentation for operations teams  

This foundation will enable safe deployments (Sprint 3) with confidence that issues are caught immediately.

**Next**: Begin Sentry and OpenTelemetry integration.

