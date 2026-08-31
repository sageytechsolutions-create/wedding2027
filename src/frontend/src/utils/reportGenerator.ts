import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PortfolioData {
  totalValue: number;
  ytdROI: number;
  annualizedReturns: number;
  monthlyCashFlow: number;
  properties: PropertyData[];
  riskScore: number;
  diversificationScore: number;
}

export interface PropertyData {
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

export class ReportGenerator {
  private pdf: jsPDF;
  private pageHeight: number = 297;
  private pageWidth: number = 210;
  private margin: number = 15;
  private currentY: number = 15;
  private portfolioData: PortfolioData;
  private generatedDate: Date;

  constructor(portfolioData: PortfolioData) {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.portfolioData = portfolioData;
    this.generatedDate = new Date();
  }

  private addPage(): void {
    this.pdf.addPage();
    this.currentY = this.margin;
  }

  private addText(
    text: string,
    fontSize: number = 12,
    options: { bold?: boolean; color?: [number, number, number]; x?: number; align?: 'left' | 'center' | 'right' } = {}
  ): void {
    const { bold = false, color = [0, 0, 0], x = this.margin, align = 'left' } = options;
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(color[0], color[1], color[2]);

    const textWidth = this.pageWidth - 2 * this.margin;
    const textLines = this.pdf.splitTextToSize(text, textWidth);

    if (align === 'center') {
      this.pdf.text(textLines, this.pageWidth / 2, this.currentY, { align: 'center' });
    } else if (align === 'right') {
      this.pdf.text(textLines, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    } else {
      this.pdf.text(textLines, x, this.currentY);
    }

    this.currentY += textLines.length * 7;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private addSpacing(amount: number = 10): void {
    this.currentY += amount;
  }

  private checkPageBreak(requiredSpace: number = 30): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addPage();
    }
  }

  private addTable(
    headers: string[],
    rows: (string | number)[][],
    columnWidths?: number[]
  ): void {
    const pageWidth = this.pageWidth - 2 * this.margin;
    const colWidth = columnWidths || Array(headers.length).fill(pageWidth / headers.length);

    this.checkPageBreak(40);

    let xPos = this.margin;

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFillColor(59, 130, 246);

    headers.forEach((header, i) => {
      this.pdf.rect(xPos, this.currentY, colWidth[i], 8, 'F');
      this.pdf.text(header, xPos + 2, this.currentY + 5);
      xPos += colWidth[i];
    });

    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(0, 0, 0);

    rows.forEach((row) => {
      this.checkPageBreak(10);
      xPos = this.margin;

      row.forEach((cell, i) => {
        const cellText = typeof cell === 'number' ? this.formatCurrency(cell) : String(cell);
        this.pdf.text(cellText, xPos + 2, this.currentY + 5);
        xPos += colWidth[i];
      });

      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(
        this.margin,
        this.currentY + 8,
        this.pageWidth - this.margin,
        this.currentY + 8
      );

      this.currentY += 10;
    });
  }

  async addCoverPage(): Promise<void> {
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(32);
    this.pdf.setTextColor(31, 41, 55);

    this.currentY = 80;
    this.pdf.text('Investment Portfolio Report', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY = 110;
    this.pdf.setFontSize(14);
    this.pdf.text(this.generatedDate.toLocaleDateString(), this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY = 150;
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128);

    const summaryText = `
This report provides a comprehensive analysis of your real estate investment portfolio,
including property valuations, financial performance, risk assessment, and market insights.

Generated: ${this.generatedDate.toLocaleString()}
Portfolio Value: ${this.formatCurrency(this.portfolioData.totalValue)}
Year-to-Date ROI: ${this.portfolioData.ytdROI.toFixed(1)}%
`;

    this.pdf.text(summaryText, this.margin, this.currentY);

    this.currentY = 260;
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(156, 163, 175);
    this.pdf.text('This is a confidential document. Do not share without permission.', this.pageWidth / 2, this.currentY, { align: 'center' });
  }

  async addSummaryPage(): Promise<void> {
    this.addPage();

    this.addText('Portfolio Summary', 18, { bold: true });
    this.addSpacing(8);

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');

    const summaryData = [
      { label: 'Total Portfolio Value', value: this.formatCurrency(this.portfolioData.totalValue) },
      { label: 'Year-to-Date ROI', value: `${this.portfolioData.ytdROI.toFixed(2)}%` },
      { label: 'Annualized Returns', value: `${this.portfolioData.annualizedReturns.toFixed(2)}%` },
      { label: 'Monthly Cash Flow', value: this.formatCurrency(this.portfolioData.monthlyCashFlow) },
      { label: 'Risk Score', value: `${this.portfolioData.riskScore}/100` },
      { label: 'Diversification Score', value: `${this.portfolioData.diversificationScore}/100` },
    ];

    summaryData.forEach((item) => {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(item.label, this.margin, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(item.value, this.pageWidth - this.margin - 30, this.currentY, { align: 'right' });
      this.currentY += 8;
    });

    this.addSpacing(15);

    this.addText('Property Performance', 14, { bold: true });
    this.addSpacing(8);

    const propertyHeaders = ['Property', 'Acquisition', 'Cost Basis', 'Current Value', 'Gain', 'ROI'];
    const propertyRows = this.portfolioData.properties.map((p) => [
      p.address.substring(0, 20),
      p.acquisitionDate,
      p.costBasis,
      p.currentValue,
      p.gain,
      `${p.roi.toFixed(1)}%`,
    ]);

    this.addTable(propertyHeaders, propertyRows, [45, 25, 25, 35, 25, 20]);
  }

  async addPropertyPages(): Promise<void> {
    for (const property of this.portfolioData.properties) {
      this.addPage();

      this.addText(`${property.address}`, 16, { bold: true, color: [31, 41, 55] });
      this.addText(property.city, 11, { color: [107, 114, 128] });
      this.addSpacing(8);

      const propertyMetrics = [
        { label: 'Acquisition Date', value: property.acquisitionDate },
        { label: 'Cost Basis', value: this.formatCurrency(property.costBasis) },
        { label: 'Current Value', value: this.formatCurrency(property.currentValue) },
        { label: 'Gain/Loss', value: this.formatCurrency(property.gain) },
        { label: 'ROI', value: `${property.roi.toFixed(2)}%` },
      ];

      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.addText('Property Metrics', 12, { bold: true });
      this.addSpacing(4);

      propertyMetrics.forEach((metric) => {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(10);
        this.pdf.text(metric.label, this.margin, this.currentY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(metric.value, this.pageWidth - this.margin - 30, this.currentY, { align: 'right' });
        this.currentY += 7;
      });

      this.addSpacing(12);

      this.addText('Financial Analysis', 12, { bold: true });
      this.addSpacing(4);

      const financialMetrics = [
        { label: 'Annual Rental Income', value: this.formatCurrency(property.annualRent) },
        { label: 'Annual Expenses', value: this.formatCurrency(property.annualExpenses) },
        { label: 'Annual Net Income', value: this.formatCurrency(property.annualRent - property.annualExpenses) },
        { label: 'Cap Rate', value: `${(((property.annualRent - property.annualExpenses) / property.currentValue) * 100).toFixed(2)}%` },
      ];

      financialMetrics.forEach((metric) => {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(10);
        this.pdf.text(metric.label, this.margin, this.currentY);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(metric.value, this.pageWidth - this.margin - 30, this.currentY, { align: 'right' });
        this.currentY += 7;
      });
    }
  }

  async addAppendix(): Promise<void> {
    this.addPage();

    this.addText('Appendix', 16, { bold: true });
    this.addSpacing(8);

    this.addText('Methodology', 12, { bold: true });
    this.addSpacing(4);

    const methodologyText = `
Property Valuation: Values are based on comparable market analysis (CMA) and the AI valuation model, which considers location, property characteristics, recent sales, and market trends.

ROI Calculation: Return on Investment is calculated as (Current Value - Cost Basis) / Cost Basis * 100, expressed as a percentage.

Risk Assessment: Overall risk score is calculated across five dimensions: market risk, property-specific risk, financial risk, tenant risk, and economic risk factors.

Diversification Score: Measures the spread of investments across geographic locations, property types, and investment strategies (rental vs. flip vs. appreciation).
`;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    const methodologyLines = this.pdf.splitTextToSize(methodologyText, this.pageWidth - 2 * this.margin);
    this.pdf.text(methodologyLines, this.margin, this.currentY);
    this.currentY += methodologyLines.length * 5 + 15;

    this.addText('Disclaimer', 12, { bold: true });
    this.addSpacing(4);

    const disclaimerText = `
This report is provided for informational purposes only and does not constitute investment advice. Past performance does not guarantee future results. Real estate investments involve substantial risk, including potential loss of principal. Valuations are estimates and subject to market conditions. Consult with a qualified financial advisor before making investment decisions.
`;

    const disclaimerLines = this.pdf.splitTextToSize(disclaimerText, this.pageWidth - 2 * this.margin);
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text(disclaimerLines, this.margin, this.currentY);
  }

  async generatePDF(): Promise<Blob> {
    await this.addCoverPage();
    await this.addSummaryPage();
    await this.addPropertyPages();
    await this.addAppendix();

    return this.pdf.output('blob');
  }

  async downloadPDF(filename: string = 'portfolio_report.pdf'): Promise<void> {
    const blob = await this.generatePDF();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
