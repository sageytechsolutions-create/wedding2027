# Production Monitoring Setup - Phase 7 Sprint 3

**Status**: ✅ Complete monitoring infrastructure specification  
**Date**: 2026-09-02  
**Components**: Prometheus, Grafana, Jaeger, AlertManager

---

## Monitoring Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Application Services                        │
│  ├─ backend-blue/green (metrics + traces)               │
│  ├─ frontend-blue/green (client metrics)                │
│  ├─ PostgreSQL (query metrics)                          │
│  └─ Redis (cache metrics)                               │
└──────────┬───────────────────────────────────────────────┘
           │ Metrics (port 9090)
           │ Traces (OTLP port 4317)
           │ Logs (stdout/file)
           │
┌──────────▼───────────────────────────────────────────────┐
│            OpenTelemetry Collector                       │
│  ├─ OTLP receiver (traces)                              │
│  ├─ Prometheus receiver (metrics)                       │
│  ├─ Jaeger exporter (traces)                            │
│  └─ Prometheus exporter (metrics)                       │
└──────────┬───────────────────────────────────────────────┘
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
┌────┐ ┌────┐ ┌────┐
│ P  │ │ J  │ │ A  │
│ r  │ │ a  │ │ l  │
│ o  │ │ e  │ │ e  │
│ m  │ │ g  │ │ r  │
│    │ │ e  │ │ t  │
│ e  │ │ r  │ │ s  │
│ t  │ │    │ │    │
│ h  │ │ U  │ │ M  │
│ e  │ │ I  │ │ g  │
│ u  │ │    │ │ r  │
│ s  │ │ :  │ │ :  │
│    │ │ 1  │ │ 9  │
│ :  │ │ 6  │ │ 0  │
│ 9  │ │ 6  │ │ 9  │
│ 0  │ │ 8  │ │ 3  │
│ 9  │ │ 6  │ │    │
│ 0  │ │    │ │    │
└────┘ └────┘ └────┘
```

---

## Pre-Deployment Setup

### 1. Install Monitoring Stack

```bash
# On production monitoring server
cd /opt/monitoring

# Clone monitoring compose configuration
cat > docker-compose.monitoring.yml << 'COMPOSE'
version: '3.8'

services:
  # Prometheus - Metrics database
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    restart: always
    networks:
      - monitoring

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ADMIN_USER=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - ./grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml
    depends_on:
      - prometheus
    restart: always
    networks:
      - monitoring

  # Jaeger - Distributed tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "4317:4317"  # OTLP receiver
      - "6831:6831/udp"  # Jaeger receiver
      - "16686:16686"  # Jaeger UI
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    volumes:
      - jaeger_data:/badger/data
    restart: always
    networks:
      - monitoring

  # AlertManager - Alert routing
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: always
    networks:
      - monitoring

  # OpenTelemetry Collector - Log aggregation
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    ports:
      - "4317:4317"   # OTLP receiver
      - "55679:55679"  # ZPages
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    command:
      - "--config=/etc/otel-collector-config.yml"
    depends_on:
      - prometheus
      - jaeger
    restart: always
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  jaeger_data:
  alertmanager_data:
COMPOSE

# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Verify all services
docker compose -f docker-compose.monitoring.yml ps
```

### 2. Prometheus Configuration

```bash
# Create prometheus.yml
cat > prometheus.yml << 'YAML'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'production'
    team: 'platform'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

rule_files:
  - 'prometheus-rules.yml'

scrape_configs:
  # Backend metrics
  - job_name: 'backend-blue'
    static_configs:
      - targets: ['backend-blue:9090']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'backend-blue'

  - job_name: 'backend-green'
    static_configs:
      - targets: ['backend-green:9090']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'backend-green'

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Nginx metrics
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  # Node metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
YAML
```

### 3. Alert Rules Configuration

```bash
# Create prometheus-rules.yml
cat > prometheus-rules.yml << 'YAML'
groups:
  - name: application
    interval: 30s
    rules:
      # Error rate alert
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          service: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook: "https://runbooks.example.com/high-error-rate"

      # Response time alert
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          service: backend
        annotations:
          summary: "Slow response times"
          description: "p95 latency is {{ $value }}s (threshold: 2s)"

      # Database connection alert
      - alert: HighDatabaseConnections
        expr: |
          pg_stat_activity_count > 150
        for: 5m
        labels:
          severity: warning
          service: database
        annotations:
          summary: "High database connection count"
          description: "Active connections: {{ $value }} (threshold: 150)"

      # Memory usage alert
      - alert: HighMemoryUsage
        expr: |
          (
            1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
          ) > 0.85
        for: 5m
        labels:
          severity: warning
          service: system
        annotations:
          summary: "High memory usage"
          description: "Memory usage: {{ $value | humanizePercentage }} (threshold: 85%)"

      # Disk space alert
      - alert: LowDiskSpace
        expr: |
          (
            node_filesystem_avail_bytes{fstype=~"ext4|xfs"}
            /
            node_filesystem_size_bytes{fstype=~"ext4|xfs"}
          ) < 0.1
        for: 5m
        labels:
          severity: critical
          service: system
        annotations:
          summary: "Low disk space"
          description: "Disk space available: {{ $value | humanizePercentage }} (threshold: 10%)"

      # Service down alert
      - alert: ServiceDown
        expr: up{job=~"backend.*|postgres|redis"} == 0
        for: 2m
        labels:
          severity: critical
          service: infrastructure
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.job }} on {{ $labels.instance }} is down"

  - name: sla
    interval: 1m
    rules:
      # Uptime calculation
      - record: sla:uptime:5m
        expr: |
          (
            count(up{job=~"backend.*"} == 1)
            /
            count(up{job=~"backend.*"})
          ) * 100

      # Request rate
      - record: sla:request_rate:5m
        expr: sum(rate(http_requests_total[5m]))

      # Error rate
      - record: sla:error_rate:5m
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) * 100
YAML
```

### 4. AlertManager Configuration

```bash
# Create alertmanager.yml
cat > alertmanager.yml << 'YAML'
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  routes:
    # Critical alerts
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
      group_wait: 0s
      repeat_interval: 5m

    # High priority alerts
    - match:
        severity: warning
      receiver: 'slack-alerts'
      group_wait: 30s
      repeat_interval: 2h

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    slack_configs:
      - channel: '#incidents'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'slack-alerts'
    slack_configs:
      - channel: '#alerts'
        title: '⚠️  {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

inhibit_rules:
  # Inhibit low-priority alerts if high-priority alert is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
YAML
```

### 5. Grafana Data Source Configuration

```bash
# Create grafana-datasources.yml
cat > grafana-datasources.yml << 'YAML'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
YAML
```

---

## Grafana Dashboard Setup

### Key Dashboards to Create

**1. Application Overview Dashboard**

```json
{
  "dashboard": {
    "title": "Application Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {"expr": "sum(rate(http_requests_total[5m]))"}
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {"expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"}
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {"expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"}
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {"expr": "count(increase(http_requests_total[1m]))"}
        ]
      }
    ]
  }
}
```

**2. Database Performance Dashboard**

```json
{
  "dashboard": {
    "title": "Database Performance",
    "panels": [
      {
        "title": "Connection Count",
        "targets": [
          {"expr": "pg_stat_activity_count"}
        ]
      },
      {
        "title": "Query Duration (avg)",
        "targets": [
          {"expr": "avg(pg_stat_statements_mean_time)"}
        ]
      },
      {
        "title": "Cache Hit Ratio",
        "targets": [
          {"expr": "rate(pg_stat_database_heap_blks_hit[5m]) / (rate(pg_stat_database_heap_blks_hit[5m]) + rate(pg_stat_database_heap_blks_read[5m]))"}
        ]
      },
      {
        "title": "Slow Queries",
        "targets": [
          {"expr": "pg_stat_statements_mean_time > 1000"}
        ]
      }
    ]
  }
}
```

**3. Infrastructure Health Dashboard**

```json
{
  "dashboard": {
    "title": "Infrastructure Health",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {"expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"}
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {"expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"}
        ]
      },
      {
        "title": "Disk Usage",
        "targets": [
          {"expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100"}
        ]
      },
      {
        "title": "Network I/O",
        "targets": [
          {"expr": "rate(node_network_receive_bytes_total[5m])"}
        ]
      }
    ]
  }
}
```

---

## Post-Deployment Monitoring

### Access Monitoring Dashboards

**URLs:**
- Prometheus: `http://monitoring-server:9090`
- Grafana: `http://monitoring-server:3000` (admin/admin)
- Jaeger: `http://monitoring-server:16686`
- AlertManager: `http://monitoring-server:9093`

### First Hour Monitoring Checklist

```
Every 5 minutes:
☐ Check Error Rate (should be < 0.1%)
☐ Check Response Time p95 (should be < 200ms)
☐ Check Memory Usage (should be < 500MB)
☐ Check CPU Usage (should be < 50%)

Every 15 minutes:
☐ Review application logs
☐ Check for any warnings
☐ Monitor database performance

At 1 hour mark:
☐ Verify all metrics are normal
☐ Review any anomalies
☐ Check SLA metrics
```

### Daily Monitoring

```
Daily at 9:00 AM:
☐ Review previous 24-hour metrics
☐ Check error logs
☐ Review slow query logs
☐ Verify backup completion
☐ Check certificate expiration (30+ days remaining)

Daily at 5:00 PM:
☐ Review performance trends
☐ Check resource usage patterns
☐ Verify monitoring system health
☐ Update incident log if needed
```

### Weekly Review

```
Every Monday:
☐ Performance trends analysis
☐ Capacity planning review
☐ Security audit logs
☐ Alert tuning review
  - False positives?
  - Thresholds appropriate?
  - Missing alerts?
```

---

## Alert Thresholds

### Production SLA Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | 99.5% | 99.0% |
| Error Rate | < 0.1% | 0.5% | 5% |
| Response Time (p95) | < 200ms | 500ms | 2s |
| Memory Usage | < 400MB | 80% | 90% |
| CPU Usage | < 30% | 75% | 90% |
| Disk Space | > 20% free | 10% | 5% |
| DB Connections | < 100 | 150 | 200 |
| Cache Hit Rate | > 80% | 70% | 50% |

---

## Troubleshooting Monitoring

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify service is running
docker ps | grep prometheus

# Check logs
docker logs prometheus | tail -50
```

### Grafana Dashboard Empty

```bash
# Verify Prometheus datasource
# In Grafana: Configuration → Data Sources → Test

# Ensure metrics are being collected
curl 'http://localhost:9090/api/v1/query?query=up'

# Restart Grafana
docker restart grafana
```

### Alerts Not Firing

```bash
# Test alert rules
curl http://localhost:9090/api/v1/rules

# Verify AlertManager is receiving alerts
curl http://localhost:9093/api/v1/alerts

# Check AlertManager logs
docker logs alertmanager | tail -50
```

---

## Backup and Retention

### Prometheus Data Retention

```bash
# Production: 30 days
# Backup: Daily to S3

# In docker-compose:
# --storage.tsdb.retention.time=30d

# Automated daily backup
0 2 * * * docker exec prometheus tar czf /backups/prometheus-$(date +\%Y\%m\%d).tar.gz /prometheus
```

### Grafana Dashboard Backup

```bash
# Export all dashboards
./scripts/export-grafana-dashboards.sh

# Store in git repository
git add grafana/dashboards/
git commit -m "Backup Grafana dashboards"
```

---

## Monitoring Cost Optimization

### Data Retention vs Storage

```
Current: 30 days @ ~1GB/day = 30GB storage
Cost: ~$1/month (S3 standard)

Optimization:
- Keep 30 days detailed metrics
- Aggregate to 1-hour summaries after 7 days
- Reduce to daily summaries after 30 days
```

---

**Status**: 🟢 Monitoring Setup Complete  
**Next Step**: Deploy monitoring stack before production deployment

