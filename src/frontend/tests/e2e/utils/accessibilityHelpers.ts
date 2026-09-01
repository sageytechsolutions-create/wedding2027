import { Page, Locator, expect } from '@playwright/test';

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'notice';
  message: string;
  selector?: string;
}

export class AccessibilityHelpers {
  static async checkHeadingStructure(page: Page): Promise<string[]> {
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => {
        const level = parseInt(el.tagName[1]);
        return { level, text: el.textContent?.trim() };
      });
    });

    const issues: string[] = [];
    let lastLevel = 0;

    for (const heading of headings) {
      // Check for skipped heading levels
      if (heading.level > lastLevel + 1) {
        issues.push(`Heading level jumped from h${lastLevel} to h${heading.level}: "${heading.text}"`);
      }
      lastLevel = heading.level;
    }

    return issues;
  }

  static async checkImageAltText(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');

      if (!alt || alt.trim() === '') {
        issues.push({
          type: 'error',
          message: `Image missing alt text: ${src}`,
          selector: `img[src="${src}"]`,
        });
      } else if (alt.length > 125) {
        issues.push({
          type: 'warning',
          message: `Image alt text too long (${alt.length} chars): ${src}`,
          selector: `img[src="${src}"]`,
        });
      }
    }

    return issues;
  }

  static async checkFormLabels(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const inputs = await page.locator('input, textarea, select').all();

    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Check if input has associated label
      let hasLabel = false;

      if (inputId) {
        const label = await page.locator(`label[for="${inputId}"]`).count();
        hasLabel = label > 0;
      }

      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        issues.push({
          type: 'error',
          message: `Form input not labeled: ${type} [${name}]`,
          selector: `input[name="${name}"]`,
        });
      }
    }

    return issues;
  }

  static async checkButtonLabels(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      if ((!text || text.trim() === '') && !ariaLabel && !title) {
        issues.push({
          type: 'error',
          message: 'Button has no accessible label',
          selector: 'button',
        });
      }
    }

    return issues;
  }

  static async checkColorContrast(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // This is a simplified check - real contrast checking requires color parsing
    const elements = await page.locator('p, a, span, button, h1, h2, h3, h4, h5, h6').all();

    for (const element of elements) {
      const computed = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
        };
      });

      // Check for low contrast (simplified: white text on white background)
      if (computed.color === computed.backgroundColor) {
        issues.push({
          type: 'warning',
          message: 'Possible low contrast between text and background',
          selector: 'element',
        });
      }
    }

    return issues;
  }

  static async checkLinkTexts(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const links = await page.locator('a').all();
    const poorLinkTexts = ['click here', 'read more', 'link', 'more', 'here', '>>'];

    for (const link of links) {
      const text = (await link.textContent())?.toLowerCase().trim() || '';
      const href = await link.getAttribute('href');
      const ariaLabel = await link.getAttribute('aria-label');

      if (!ariaLabel && poorLinkTexts.some((poor) => text.includes(poor))) {
        issues.push({
          type: 'warning',
          message: `Link has non-descriptive text: "${text}"`,
          selector: `a[href="${href}"]`,
        });
      }

      if (!text && !ariaLabel) {
        issues.push({
          type: 'error',
          message: `Link missing text: ${href}`,
          selector: `a[href="${href}"]`,
        });
      }
    }

    return issues;
  }

  static async checkLandmarkRegions(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for main landmark
    const main = await page.locator('main').count();
    if (main === 0) {
      issues.push({
        type: 'warning',
        message: 'Page missing <main> landmark region',
      });
    }

    // Check for header
    const header = await page.locator('header').count();
    if (header === 0) {
      issues.push({
        type: 'notice',
        message: 'Page missing <header> landmark region',
      });
    }

    // Check for navigation
    const nav = await page.locator('nav').count();
    if (nav === 0) {
      issues.push({
        type: 'notice',
        message: 'Page missing <nav> landmark region',
      });
    }

    // Check for footer
    const footer = await page.locator('footer').count();
    if (footer === 0) {
      issues.push({
        type: 'notice',
        message: 'Page missing <footer> landmark region',
      });
    }

    return issues;
  }

  static async checkAriaAttributes(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for aria-hidden with focusable elements
    const ariaHidden = await page.locator('[aria-hidden="true"]').all();

    for (const element of ariaHidden) {
      const tabindex = await element.getAttribute('tabindex');
      const isButton = (await element.evaluate((el) => el.tagName)) === 'BUTTON';

      if (tabindex || isButton) {
        issues.push({
          type: 'error',
          message: 'Focusable element hidden from assistive technology',
          selector: '[aria-hidden="true"]',
        });
      }
    }

    return issues;
  }

  static async checkKeyboardNavigation(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for focusable elements
    const focusable = await page.locator('a, button, input, select, textarea, [tabindex]').count();

    if (focusable === 0) {
      issues.push({
        type: 'warning',
        message: 'Page has no keyboard-focusable elements',
      });
    }

    // Try keyboard navigation
    try {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName || 'NONE');

      if (focused === 'BODY' || focused === 'HTML') {
        issues.push({
          type: 'warning',
          message: 'Tab key does not focus any interactive elements',
        });
      }
    } catch (error) {
      issues.push({
        type: 'notice',
        message: 'Could not test keyboard navigation',
      });
    }

    return issues;
  }

  static async runFullAccessibilityAudit(page: Page): Promise<{
    errors: AccessibilityIssue[];
    warnings: AccessibilityIssue[];
    notices: AccessibilityIssue[];
  }> {
    const allIssues: AccessibilityIssue[] = [];

    allIssues.push(...(await this.checkImageAltText(page)));
    allIssues.push(...(await this.checkFormLabels(page)));
    allIssues.push(...(await this.checkButtonLabels(page)));
    allIssues.push(...(await this.checkLinkTexts(page)));
    allIssues.push(...(await this.checkLandmarkRegions(page)));
    allIssues.push(...(await this.checkAriaAttributes(page)));
    allIssues.push(...(await this.checkKeyboardNavigation(page)));

    return {
      errors: allIssues.filter((i) => i.type === 'error'),
      warnings: allIssues.filter((i) => i.type === 'warning'),
      notices: allIssues.filter((i) => i.type === 'notice'),
    };
  }

  static generateAccessibilityReport(
    headingIssues: string[],
    audit: {
      errors: AccessibilityIssue[];
      warnings: AccessibilityIssue[];
      notices: AccessibilityIssue[];
    }
  ): string {
    return `
Accessibility Audit Report
==========================

Heading Structure Issues: ${headingIssues.length}
${headingIssues.map((issue) => `  - ${issue}`).join('\n')}

Errors: ${audit.errors.length}
${audit.errors.map((issue) => `  - ${issue.message}`).join('\n')}

Warnings: ${audit.warnings.length}
${audit.warnings.map((issue) => `  - ${issue.message}`).join('\n')}

Notices: ${audit.notices.length}
${audit.notices.map((issue) => `  - ${issue.message}`).join('\n')}

Summary:
--------
Total Issues: ${headingIssues.length + audit.errors.length + audit.warnings.length + audit.notices.length}
Severity Level: ${audit.errors.length > 0 ? 'HIGH' : audit.warnings.length > 0 ? 'MEDIUM' : 'LOW'}
    `;
  }
}
