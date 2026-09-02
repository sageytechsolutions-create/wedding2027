import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface PortfolioSnapshot {
  portfolioId: string;
  userId: string;
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

export interface PropertySnapshot {
  id: string;
  address: string;
  city: string;
  acquisitionDate: string;
  costBasis: number;
  currentValue: number;
  gain: number;
  roi: number;
  annualRent: number;
  annualExpenses: number;
}

export interface ReportConfig {
  portfolioId: string;
  reportType: 'summary' | 'full' | 'executive';
  includeCharts: boolean;
  includeProperties: boolean;
}

export interface ReportMetadata {
  reportId: string;
  portfolioId: string;
  reportType: string;
  generatedAt: Date;
  pageCount: number;
  fileSize: number;
}

export class ReportGenerationService {
  async generatePortfolioReport(
    portfolioId: string,
    reportType: 'summary' | 'full' | 'executive' = 'summary'
  ): Promise<Buffer> {
    try {
      // Get portfolio snapshot
      const snapshot = await this.getPortfolioSnapshot(portfolioId);

      // Build report based on type
      let reportHtml = this.buildReportHtml(snapshot, reportType);

      // Convert HTML to PDF (mock implementation)
      const pdfBuffer = await this.htmlToPdf(reportHtml);

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  private async getPortfolioSnapshot(portfolioId: string): Promise<PortfolioSnapshot> {
    // TODO: Fetch real portfolio data from database
    // For now, return mock data
    return {
      portfolioId,
      userId: '',
      totalValue: 1350000,
      totalCostBasis: 1100000,
      totalGain: 250000,
      ytdROI: 20.5,
      annualizedReturns: 15.2,
      monthlyCashFlow: 5083,
      properties: [
        {
          id: 'prop_1',
          address: '456 Main St',
          city: 'Denver',
          acquisitionDate: '2022-03-15',
          costBasis: 450000,
          currentValue: 520000,
          gain: 70000,
          roi: 15.6,
          annualRent: 30000,
          annualExpenses: 9000,
        },
        {
          id: 'prop_2',
          address: '789 Oak Ave',
          city: 'Denver',
          acquisitionDate: '2021-06-20',
          costBasis: 425000,
          currentValue: 495000,
          gain: 70000,
          roi: 16.5,
          annualRent: 25000,
          annualExpenses: 8000,
        },
        {
          id: 'prop_3',
          address: '321 Pine Rd',
          city: 'Boulder',
          acquisitionDate: '2023-01-10',
          costBasis: 625000,
          currentValue: 680000,
          gain: 55000,
          roi: 8.8,
          annualRent: 35000,
          annualExpenses: 12000,
        },
      ],
      riskScore: 32,
      diversificationScore: 78,
      generatedAt: new Date(),
    };
  }

  private buildReportHtml(snapshot: PortfolioSnapshot, reportType: string): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    };

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .page-break { page-break-after: always; }
          .header { border-bottom: 2px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #333; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .metric-card { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; }
          .metric-label { font-size: 12px; font-weight: bold; color: #6c757d; text-transform: uppercase; }
          .metric-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f8f9fa; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #dee2e6; }
          td { padding: 10px; border-bottom: 1px solid #dee2e6; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
    `;

    // Cover page
    if (reportType !== 'executive') {
      html += `
        <div style="text-align: center; margin-top: 100px;">
          <h1>Portfolio Report</h1>
          <p>Generated on ${snapshot.generatedAt.toLocaleDateString()}</p>
          <p style="margin-top: 50px; color: #666;">
            Total Portfolio Value: <strong>${formatCurrency(snapshot.totalValue)}</strong>
          </p>
        </div>
        <div class="page-break"></div>
      `;
    }

    // Summary section
    html += `
      <div class="header">
        <h1>Portfolio Summary</h1>
      </div>

      <div class="metrics">
        <div class="metric-card">
          <div class="metric-label">Total Value</div>
          <div class="metric-value">${formatCurrency(snapshot.totalValue)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Year-to-Date ROI</div>
          <div class="metric-value" style="color: #28a745;">${snapshot.ytdROI.toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Annualized Returns</div>
          <div class="metric-value" style="color: #28a745;">${snapshot.annualizedReturns.toFixed(2)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Monthly Cash Flow</div>
          <div class="metric-value" style="color: #28a745;">${formatCurrency(snapshot.monthlyCashFlow)}</div>
        </div>
      </div>
    `;

    // Properties section
    if (reportType !== 'executive') {
      html += `
        <div class="section">
          <div class="section-title">Property Performance</div>
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Acquisition</th>
                <th>Cost Basis</th>
                <th>Current Value</th>
                <th>Gain/Loss</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
      `;

      snapshot.properties.forEach((prop) => {
        html += `
          <tr>
            <td>${prop.address}<br><small>${prop.city}</small></td>
            <td>${prop.acquisitionDate}</td>
            <td>${formatCurrency(prop.costBasis)}</td>
            <td>${formatCurrency(prop.currentValue)}</td>
            <td style="color: ${prop.gain >= 0 ? '#28a745' : '#dc3545'}">${formatCurrency(prop.gain)}</td>
            <td><strong>${prop.roi.toFixed(2)}%</strong></td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      // Financial summary
      html += `
        <div class="section">
          <div class="section-title">Financial Summary</div>
          <table>
            <tr>
              <td><strong>Total Rent Income</strong></td>
              <td style="text-align: right; color: #28a745;"><strong>${formatCurrency(
                snapshot.properties.reduce((sum, p) => sum + p.annualRent, 0)
              )}</strong></td>
            </tr>
            <tr>
              <td><strong>Total Expenses</strong></td>
              <td style="text-align: right; color: #dc3545;"><strong>${formatCurrency(
                snapshot.properties.reduce((sum, p) => sum + p.annualExpenses, 0)
              )}</strong></td>
            </tr>
            <tr>
              <td><strong>Annual Net Income</strong></td>
              <td style="text-align: right; color: #28a745;"><strong>${formatCurrency(
                snapshot.properties.reduce((sum, p) => sum + p.annualRent - p.annualExpenses, 0)
              )}</strong></td>
            </tr>
          </table>
        </div>
      `;
    }

    // Risk & Diversification
    html += `
      <div class="section">
        <div class="section-title">Risk & Diversification</div>
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Risk Score</div>
            <div class="metric-value" style="color: #28a745;">${snapshot.riskScore}/100</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Diversification</div>
            <div class="metric-value" style="color: #28a745;">${snapshot.diversificationScore}/100</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Methodology & Disclaimer</div>
        <p>
          This report is provided for informational purposes only and does not constitute investment advice.
          All valuations are estimates based on comparable market analysis and historical data. Past performance
          does not guarantee future results. Consult with a qualified financial advisor before making investment decisions.
        </p>
      </div>
    `;

    html += '</body></html>';
    return html;
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    // Mock implementation - returns a simple PDF-like buffer
    // In production, use a library like puppeteer or weasyprint
    const timestamp = new Date().toISOString();
    const mockPdfContent = `
      PDF Report Generated
      Timestamp: ${timestamp}
      Content Length: ${html.length}
      Status: Success
    `;

    return Buffer.from(mockPdfContent, 'utf-8');
  }

  async saveReportMetadata(
    portfolioId: string,
    userId: string,
    reportType: string,
    fileSize: number
  ): Promise<ReportMetadata> {
    const reportId = randomUUID();

    try {
      await prisma.reportGeneration.create({
        data: {
          id: reportId,
          portfolioId: portfolioId,
          userId: userId,
          reportType: reportType,
          fileSize: fileSize,
          generatedAt: new Date(),
        },
      });

      return {
        reportId,
        portfolioId,
        reportType,
        generatedAt: new Date(),
        pageCount: Math.ceil(fileSize / 1000),
        fileSize,
      };
    } catch (error) {
      console.error('Error saving report metadata:', error);
      throw new Error('Failed to save report metadata');
    }
  }

  async getReportHistory(portfolioId: string, limit: number = 10): Promise<ReportMetadata[]> {
    try {
      const reports = await prisma.reportGeneration.findMany({
        where: { portfolioId: portfolioId },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      });

      return reports.map((r) => ({
        reportId: r.id,
        portfolioId: r.portfolioId,
        reportType: r.reportType,
        generatedAt: r.generatedAt,
        pageCount: Math.ceil(r.fileSize / 1000),
        fileSize: r.fileSize,
      }));
    } catch (error) {
      console.error('Error getting report history:', error);
      return [];
    }
  }

  async deleteOldReports(portfolioId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const result = await prisma.reportGeneration.deleteMany({
        where: {
          portfolioId: portfolioId,
          generatedAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error deleting old reports:', error);
      return 0;
    }
  }
}

export const reportGenerationService = new ReportGenerationService();
