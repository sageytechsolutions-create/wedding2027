# Phase 3 Sprint 5 - Backend Services

**Status**: In Progress  
**Duration**: Week 11-12  
**Branch**: `claude/ai-investment-realestate-intpuu`

## Overview

Sprint 5 implements the backend infrastructure for email scheduling, metric calculations, report generation, and data caching. Building on Sprint 4's frontend features, this sprint adds persistent backend services that power the analytics and reporting pipeline.

---

## Features Implemented

### 1. Email Scheduling Service

Complete backend email scheduling system with queue-based delivery.

**Architecture:**
```
Frontend EmailScheduleModal
    ↓
    ↓ POST /api/email/schedules
    ↓
Backend EmailScheduleController
    ↓
    ├─→ EmailScheduleService (CRUD operations)
    │
    ├─→ ScheduledTaskQueue (Bull.js)
    │   ├─ Scheduled jobs stored in Redis
    │   └─ Automatic job retry with exponential backoff
    │
    └─→ EmailDeliveryService (Nodemailer)
        ├─ Template rendering
        ├─ Attachment generation
        └─ Delivery status tracking
```

**Database Schema:**

```sql
-- Email Schedules
CREATE TABLE email_schedules (
  id UUID PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  user_id UUID NOT NULL REFERENCES users(id),
  frequency VARCHAR(20) NOT NULL, -- weekly, monthly, quarterly, once
  day_of_week VARCHAR(10), -- monday, tuesday, etc.
  day_of_month INT, -- 1-28
  time_of_day TIME NOT NULL,
  report_type VARCHAR(20) NOT NULL, -- summary, full, executive
  recipients TEXT[] NOT NULL, -- array of emails
  template_id UUID REFERENCES email_templates(id),
  last_run TIMESTAMP,
  next_run TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Delivery Log
CREATE TABLE email_delivery_logs (
  id UUID PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES email_schedules(id),
  recipient_email VARCHAR(255) NOT NULL,
  report_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- sent, failed, bounced, opened
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  error_message TEXT,
  attempt_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  footer TEXT,
  header_image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Backend Implementation Files:**

```typescript
// src/backend/src/services/emailService.ts
export class EmailService {
  async scheduleReport(config: EmailScheduleConfig): Promise<EmailSchedule>;
  async updateSchedule(id: string, updates: Partial<EmailScheduleConfig>): Promise<EmailSchedule>;
  async deleteSchedule(id: string): Promise<void>;
  async getSchedules(portfolioId: string): Promise<EmailSchedule[]>;
  async sendTestEmail(scheduleId: string, recipients: string[]): Promise<void>;
}

// src/backend/src/services/emailQueueService.ts
export class EmailQueueService {
  async queueReportEmail(scheduleId: string): Promise<void>;
  async processEmailQueue(): Promise<void>;
  async retryFailedEmail(logId: string): Promise<void>;
  async getQueueStatus(): Promise<QueueStatus>;
}

// src/backend/src/services/emailDeliveryService.ts
export class EmailDeliveryService {
  async sendEmail(config: EmailConfig): Promise<{ messageId: string; status: string }>;
  async renderTemplate(templateId: string, context: Record<string, any>): Promise<string>;
  async attachReport(email: EmailConfig, reportPath: string): Promise<void>;
  async trackDelivery(logId: string, status: 'sent' | 'failed' | 'bounced'): Promise<void>;
}

// src/backend/src/routes/email.ts
Router.post('/api/email/schedules', verifyAuth, emailController.createSchedule);
Router.get('/api/email/schedules', verifyAuth, emailController.listSchedules);
Router.put('/api/email/schedules/:id', verifyAuth, emailController.updateSchedule);
Router.delete('/api/email/schedules/:id', verifyAuth, emailController.deleteSchedule);
Router.post('/api/email/test-send', verifyAuth, emailController.sendTestEmail);
Router.get('/api/email/delivery-logs', verifyAuth, emailController.getDeliveryLogs);
```

**Files:**
- New `src/backend/src/services/emailService.ts` - 300+ LOC
- New `src/backend/src/services/emailQueueService.ts` - 350+ LOC
- New `src/backend/src/services/emailDeliveryService.ts` - 250+ LOC
- New `src/backend/src/routes/email.ts` - 200+ LOC
- New `src/backend/src/controllers/emailController.ts` - 250+ LOC
- New `src/backend/src/models/emailSchedule.ts` - Prisma schema updates

### 2. Metric Calculation Service

Backend service for computing custom and built-in metrics at scale.

**Architecture:**
```
CustomMetrics Frontend
    ↓
    ↓ POST /api/metrics/calculate
    ↓
Backend MetricsController
    ↓
    ├─→ MetricsCalculationService
    │   ├─ Evaluates metric formulas
    │   ├─ Aggregates portfolio data
    │   └─ Caches results in Redis
    │
    ├─→ MetricsStore (Prisma)
    │   ├─ Persists user-defined metrics
    │   └─ Tracks calculation history
    │
    └─→ AlertsService
        ├─ Triggers on threshold breaches
        └─ Sends notifications
```

**Database Schema:**

```sql
-- User Metrics
CREATE TABLE user_metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  portfolio_id UUID REFERENCES portfolios(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  formula_type VARCHAR(20) NOT NULL, -- sum, average, ratio, formula
  formula_config JSONB NOT NULL,
  display_format VARCHAR(20) NOT NULL, -- percentage, currency, number
  threshold_alert DECIMAL(10,2),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Metric Calculations (time-series)
CREATE TABLE metric_calculations (
  id UUID PRIMARY KEY,
  metric_id UUID NOT NULL REFERENCES user_metrics(id),
  calculated_value DECIMAL(20,6) NOT NULL,
  portfolio_snapshot JSONB NOT NULL,
  calculation_time INT NOT NULL, -- milliseconds
  alert_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Metric Alerts
CREATE TABLE metric_alerts (
  id UUID PRIMARY KEY,
  metric_id UUID NOT NULL REFERENCES user_metrics(id),
  user_id UUID NOT NULL REFERENCES users(id),
  threshold_value DECIMAL(20,6),
  current_value DECIMAL(20,6),
  breach_direction VARCHAR(10), -- above, below
  is_active BOOLEAN DEFAULT true,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Backend Implementation:**

```typescript
// src/backend/src/services/metricsCalculationService.ts
export class MetricsCalculationService {
  async calculateMetric(metricId: string, portfolioData: PortfolioData): Promise<number>;
  async calculateAllMetrics(portfolioId: string): Promise<MetricResult[]>;
  async validateMetricFormula(formula: string): Promise<{ valid: boolean; error?: string }>;
  async evaluateFormula(formula: string, context: Record<string, number>): Promise<number>;
}

// src/backend/src/services/metricsAggregationService.ts
export class MetricsAggregationService {
  async aggregatePortfolioMetrics(portfolioId: string): Promise<PortfolioMetrics>;
  async calculateCashFlowMetrics(properties: Property[]): Promise<CashFlowMetrics>;
  async calculateAppreciationMetrics(properties: Property[]): Promise<AppreciationMetrics>;
  async calculateRiskMetrics(properties: Property[]): Promise<RiskMetrics>;
}

// src/backend/src/services/alertsService.ts
export class AlertsService {
  async checkMetricThresholds(portfolioId: string): Promise<Alert[]>;
  async createAlert(metricId: string, threshold: number): Promise<Alert>;
  async acknowledgeAlert(alertId: string): Promise<void>;
  async sendAlertNotification(alert: Alert): Promise<void>;
}

// src/backend/src/routes/metrics.ts
Router.get('/api/metrics/available', verifyAuth, metricsController.getAvailableMetrics);
Router.post('/api/metrics/calculate', verifyAuth, metricsController.calculateMetrics);
Router.post('/api/metrics/validate-formula', verifyAuth, metricsController.validateFormula);
Router.get('/api/metrics/history/:metricId', verifyAuth, metricsController.getMetricHistory);
Router.post('/api/metrics/alerts', verifyAuth, metricsController.createAlert);
Router.get('/api/metrics/alerts', verifyAuth, metricsController.getAlerts);
```

**Files:**
- New `src/backend/src/services/metricsCalculationService.ts` - 300+ LOC
- New `src/backend/src/services/metricsAggregationService.ts` - 250+ LOC
- New `src/backend/src/services/alertsService.ts` - 200+ LOC
- New `src/backend/src/routes/metrics.ts` - 180+ LOC
- New `src/backend/src/controllers/metricsController.ts` - 250+ LOC

### 3. Report Caching & Generation Service

Backend service for generating, caching, and storing portfolio reports.

**Architecture:**
```
Frontend "Export as PDF"
    ↓
    ↓ POST /api/reports/generate
    ↓
Backend ReportController
    ↓
    ├─→ ReportCacheService (Redis)
    │   ├─ Check cache validity
    │   └─ Store generated reports
    │
    ├─→ ReportGenerationService
    │   ├─ Aggregates portfolio data
    │   ├─ Renders charts as images
    │   └─ Generates PDF with jsPDF
    │
    └─→ ReportStorageService (S3)
        ├─ Stores report PDFs
        └─ Tracks report history
```

**Backend Implementation:**

```typescript
// src/backend/src/services/reportCacheService.ts
export class ReportCacheService {
  async getCachedReport(portfolioId: string, reportType: string): Promise<Buffer | null>;
  async cacheReport(portfolioId: string, reportType: string, reportBuffer: Buffer, ttl?: number): Promise<void>;
  async invalidateCache(portfolioId: string): Promise<void>;
  async getCacheStats(portfolioId: string): Promise<CacheStats>;
}

// src/backend/src/services/reportGenerationService.ts
export class ReportGenerationService {
  async generatePortfolioReport(portfolioId: string, reportType: 'summary' | 'full' | 'executive'): Promise<Buffer>;
  async generatePropertyReport(propertyId: string): Promise<Buffer>;
  async renderChartAsImage(chartData: ChartConfig): Promise<Buffer>;
  async compileReportPDF(components: ReportComponent[]): Promise<Buffer>;
}

// src/backend/src/services/reportStorageService.ts
export class ReportStorageService {
  async uploadReport(portfolioId: string, reportBuffer: Buffer, metadata: ReportMetadata): Promise<{ url: string; id: string }>;
  async getReportHistory(portfolioId: string): Promise<ReportRecord[]>;
  async deleteOldReports(portfolioId: string, retentionDays: number): Promise<number>;
  async getReportDownloadUrl(reportId: string, expiresIn?: number): Promise<string>;
}

// src/backend/src/routes/reports.ts
Router.post('/api/reports/generate', verifyAuth, reportController.generateReport);
Router.get('/api/reports/history', verifyAuth, reportController.getReportHistory);
Router.get('/api/reports/:id/download', verifyAuth, reportController.downloadReport);
Router.delete('/api/reports/:id', verifyAuth, reportController.deleteReport);
Router.get('/api/reports/cache-status', verifyAuth, reportController.getCacheStatus);
```

**Files:**
- New `src/backend/src/services/reportCacheService.ts` - 200+ LOC
- New `src/backend/src/services/reportGenerationService.ts` - 350+ LOC
- New `src/backend/src/services/reportStorageService.ts` - 250+ LOC
- New `src/backend/src/routes/reports.ts` - 150+ LOC
- New `src/backend/src/controllers/reportController.ts` - 200+ LOC

### 4. Job Scheduling with Bull.js

Queue-based job scheduling for background tasks.

**Implementation:**

```typescript
// src/backend/src/services/jobScheduler.ts
export class JobScheduler {
  private emailQueue: Queue;
  private reportQueue: Queue;
  private metricsQueue: Queue;

  constructor() {
    this.emailQueue = new Queue('email', redisClient);
    this.reportQueue = new Queue('reports', redisClient);
    this.metricsQueue = new Queue('metrics', redisClient);
  }

  async scheduleEmailReport(config: EmailScheduleConfig): Promise<void>;
  async scheduleMetricsCalculation(portfolioId: string): Promise<void>;
  async scheduleReportGeneration(portfolioId: string): Promise<void>;
  async processQueues(): Promise<void>;
}

// Queue Jobs
emailQueue.process(async (job) => {
  // Process scheduled email delivery
  await emailDeliveryService.sendScheduledReport(job.data);
});

reportQueue.process(async (job) => {
  // Generate and cache report
  await reportGenerationService.generateAndCache(job.data);
});

metricsQueue.process(async (job) => {
  // Calculate metrics for portfolio
  await metricsCalculationService.calculateAllMetrics(job.data.portfolioId);
});
```

**Files:**
- New `src/backend/src/services/jobScheduler.ts` - 300+ LOC
- Updated `src/backend/package.json` - Add bull (^4.11.5)

### 5. Data Aggregation Service

Comprehensive portfolio data aggregation for analytics and reporting.

**Implementation:**

```typescript
// src/backend/src/services/portfolioDataService.ts
export class PortfolioDataService {
  async getPortfolioSnapshot(portfolioId: string): Promise<PortfolioSnapshot>;
  async calculatePortfolioMetrics(portfolioId: string): Promise<PortfolioMetrics>;
  async getPropertyValuations(portfolioId: string): Promise<PropertyValuation[]>;
  async getMarketAnalysis(portfolioId: string): Promise<MarketAnalysis>;
  async getRiskAssessment(portfolioId: string): Promise<RiskAssessment>;
}

// Data structures
interface PortfolioSnapshot {
  portfolioId: string;
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  ytdROI: number;
  annualizedReturns: number;
  monthlyCashFlow: number;
  properties: PropertySnapshot[];
  riskScore: number;
  diversificationScore: number;
  generatedAt: Date;
}

interface PropertyValuation {
  propertyId: string;
  address: string;
  currentValue: number;
  acquisitionValue: number;
  gain: number;
  roi: number;
  confidence: number;
  valuation_date: Date;
}
```

**Files:**
- New `src/backend/src/services/portfolioDataService.ts` - 400+ LOC

### 6. Email Templates System

Pre-designed email templates for different report types.

**Database Schema:**

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  template_type VARCHAR(50), -- summary, full, executive, alert
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT[], -- array of template variables
  includes_chart BOOLEAN DEFAULT false,
  includes_attachment BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Template Files:**

```html
<!-- templates/email/summary-report.html -->
<div class="email-container">
  <div class="header">
    <h1>{{portfolio_name}} - Summary Report</h1>
    <p>Generated {{generated_date}}</p>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <span class="label">Total Value</span>
      <span class="value">{{total_value}}</span>
    </div>
    <div class="metric-card">
      <span class="label">YTD ROI</span>
      <span class="value">{{ytd_roi}}%</span>
    </div>
  </div>

  <div class="content">
    {{report_summary}}
  </div>

  <div class="footer">
    <p>This is a confidential document.</p>
  </div>
</div>
```

**Files:**
- New `src/backend/src/templates/email/summary-report.html`
- New `src/backend/src/templates/email/full-report.html`
- New `src/backend/src/templates/email/executive-report.html`
- New `src/backend/src/templates/email/alert-notification.html`

---

## API Endpoints

### Email Scheduling

```typescript
POST /api/email/schedules
// Create email schedule
{
  "portfolio_id": "uuid",
  "frequency": "weekly",
  "day_of_week": "monday",
  "time": "09:00",
  "report_type": "summary",
  "recipients": ["email@example.com"],
  "template_id": "uuid"
}

Response: {
  "schedule_id": "uuid",
  "status": "scheduled",
  "next_run": "2026-09-08T09:00:00Z"
}

GET /api/email/schedules
// List all schedules for authenticated user

PUT /api/email/schedules/:id
// Update schedule configuration

DELETE /api/email/schedules/:id
// Delete schedule

POST /api/email/test-send
// Send test email to verify delivery

GET /api/email/delivery-logs
// Get email delivery history with status
```

### Metrics

```typescript
POST /api/metrics/calculate
// Calculate metric for portfolio
{
  "metric_id": "uuid",
  "portfolio_id": "uuid"
}

Response: {
  "metric_id": "uuid",
  "value": 1.45,
  "calculated_at": "2026-08-31T15:30:00Z",
  "threshold_breached": false
}

POST /api/metrics/validate-formula
// Validate custom metric formula
{
  "formula": "(noi) / (annual_debt_payment)"
}

Response: {
  "valid": true,
  "error": null
}

GET /api/metrics/alerts
// Get active metric alerts

POST /api/metrics/alerts
// Create metric alert on threshold
```

### Reports

```typescript
POST /api/reports/generate
// Generate portfolio report
{
  "portfolio_id": "uuid",
  "report_type": "summary",
  "include_charts": true
}

Response: {
  "report_id": "uuid",
  "status": "generated",
  "download_url": "https://...",
  "expires_at": "2026-09-07T15:30:00Z"
}

GET /api/reports/history
// Get report generation history

GET /api/reports/:id/download
// Download generated report PDF
```

---

## Implementation Strategy

### Phase 1: Core Services (Week 11)
1. Implement EmailService and database schema
2. Add emailService to backend
3. Implement EmailQueueService with Bull.js
4. Create email routes and controllers
5. Add Prisma migrations

### Phase 2: Metrics & Reports (Week 11-12)
1. Implement MetricsCalculationService
2. Add MetricsAggregationService
3. Implement ReportCacheService
4. Add ReportGenerationService
5. Create metrics/reports routes

### Phase 3: Job Scheduling (Week 12)
1. Implement JobScheduler with Bull
2. Add cron job for email delivery
3. Add metric calculation jobs
4. Add report generation jobs
5. Implement retry logic

### Phase 4: Testing & Integration (Week 12)
1. Unit tests for all services
2. Integration tests for API endpoints
3. End-to-end tests for email workflow
4. Performance testing for calculations

---

## Dependencies to Add

```json
{
  "dependencies": {
    "bull": "^4.11.5",
    "nodemailer": "^6.9.7",
    "handlebars": "^4.7.7",
    "node-schedule": "^2.1.1"
  }
}
```

---

## Environment Configuration

```env
# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@reinvestmentplatform.com

# Redis (for Queue)
REDIS_URL=redis://localhost:6379

# Report Storage
AWS_S3_BUCKET=re-investment-reports
AWS_S3_REGION=us-west-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Job Scheduling
ENABLE_BACKGROUND_JOBS=true
JOB_PROCESSING_INTERVAL=60000
```

---

## Testing Checklist

- [ ] Email service creates schedules in database
- [ ] Email queue picks up scheduled jobs
- [ ] Test email sends successfully
- [ ] Email delivery logs track status
- [ ] Metrics calculation returns correct values
- [ ] Metric formulas validate correctly
- [ ] Metric thresholds trigger alerts
- [ ] Reports generate without errors
- [ ] Report caching works correctly
- [ ] Cached reports invalidate on property changes
- [ ] Job scheduler processes queue items
- [ ] Retry logic handles failures
- [ ] All API endpoints require authentication
- [ ] Delivery logs show correct timestamps

---

## Performance Targets

- Email generation: <2 seconds
- Metric calculation: <500ms per metric
- Report PDF generation: <5 seconds
- Cache hit rate: >80% for recent reports
- Queue processing: <1 minute for scheduled jobs
- Metric threshold check: <100ms per portfolio

---

## Files Created/Modified

**New Files:**
- `src/backend/src/services/emailService.ts`
- `src/backend/src/services/emailQueueService.ts`
- `src/backend/src/services/emailDeliveryService.ts`
- `src/backend/src/controllers/emailController.ts`
- `src/backend/src/routes/email.ts`
- `src/backend/src/services/metricsCalculationService.ts`
- `src/backend/src/services/metricsAggregationService.ts`
- `src/backend/src/services/alertsService.ts`
- `src/backend/src/controllers/metricsController.ts`
- `src/backend/src/routes/metrics.ts`
- `src/backend/src/services/reportCacheService.ts`
- `src/backend/src/services/reportGenerationService.ts`
- `src/backend/src/services/reportStorageService.ts`
- `src/backend/src/controllers/reportController.ts`
- `src/backend/src/routes/reports.ts`
- `src/backend/src/services/jobScheduler.ts`
- `src/backend/src/services/portfolioDataService.ts`
- `src/backend/src/templates/email/*.html`
- Database migration files
- `PHASE_3_SPRINT_5.md`

**Modified Files:**
- `src/backend/package.json` - Add dependencies
- `src/backend/src/index.ts` - Add email/metrics/reports routes
- `prisma/schema.prisma` - Add new models

---

## Next Steps (Sprint 6 & Beyond)

### Sprint 6 - Collaboration
1. Share reports with team members
2. Collaborative annotations
3. Report version history
4. Team metric libraries

### Sprint 7 - Intelligence
1. Anomaly detection in metrics
2. Predictive alerts
3. Automated insights generation
4. AI-powered recommendations

### Sprint 8 - Production Ready
1. Security audit and hardening
2. Performance optimization
3. Load testing
4. Production deployment

---

**Branch**: `claude/ai-investment-realestate-intpuu`  
**Status**: Sprint 5 In Progress  
**Total LOC to Add**: ~3,000+  
**Next**: Completion of all backend services and integration testing
