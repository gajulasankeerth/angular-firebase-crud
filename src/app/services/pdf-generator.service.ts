import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { PdfFormData, AreaItem } from '../components/pdf-template/pdf-template.component';

export type { PdfFormData, AreaItem };

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  // Brand color palette (RGB)
  private readonly gold = { r: 212, g: 175, b: 55 }; // #D4AF37
  private readonly goldPale = { r: 253, g: 251, b: 247 }; // #FDFBF7
  private readonly goldBorder = { r: 232, g: 201, b: 106 }; // #E8C96A
  private readonly dark = { r: 28, g: 25, b: 23 }; // #1C1917
  private readonly mid = { r: 68, g: 64, b: 60 }; // #44403C
  private readonly muted = { r: 120, g: 113, b: 108 }; // #78716C
  private readonly light = { r: 250, g: 250, b: 249 }; // #FAFAF9
  private readonly border = { r: 231, g: 229, b: 228 }; // #E7E5E4
  private readonly headerDark = { r: 41, g: 37, b: 36 }; // #292524

  // Page geometry (A4 in mm)
  private readonly pageHeight = 297;
  private readonly pageWidth = 210;
  private readonly margin = 12;
  private readonly contentWidth = 186; // 210 - 24
  private readonly footerHeight = 14;

  /**
   * Generates a 100% vector PDF with fully selectable, searchable text.
   * No canvas screenshotting, no DOM cloning, zero UI freeze.
   */
  async generatePdf(data: PdfFormData, filename?: string): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    if (filename) {
      doc.setProperties({ title: filename });
    }

    let y = this.margin;

    // 1. Brand Header
    y = this.drawBrandHeader(doc, y);

    // 2. Customer Information Grid
    y = this.ensureSpace(doc, y, 28);
    y = this.drawCustomerInfo(doc, data, y);

    // 3. Project Address & Site Details
    y = this.ensureSpace(doc, y, 36);
    y = this.drawProjectAddress(doc, data, y);

    // 4. Scope & Project Type (Chips / Checkboxes)
    y = this.ensureSpace(doc, y, 22);
    y = this.drawScopeAndProjectTypes(doc, data, y);

    // 5. Project Areas & Specifications Table
    const areaRowsHeight = Math.max(1, data.areas?.length || 0) * 7.5 + 8;
    y = this.ensureSpace(doc, y, areaRowsHeight + 12);
    y = this.drawAreasTable(doc, data.areas || [], y);

    // 6. Project Notes & Memo (if present)
    const memoText = data.clientMemo?.trim();
    if (memoText && memoText !== 'No notes provided.') {
      const splitMemo = doc.splitTextToSize(memoText, this.contentWidth - 8);
      const memoBoxHeight = Math.max(14, splitMemo.length * 4.2 + 8);
      y = this.ensureSpace(doc, y, memoBoxHeight + 10);
      y = this.drawNotesSection(doc, splitMemo, memoBoxHeight, y);
    }

    // 7. Terms of Service & Policies
    y = this.ensureSpace(doc, y, 32);
    y = this.drawTermsSection(doc, y);

    // 8. Signature Block
    y = this.ensureSpace(doc, y, 34);
    y = this.drawSignatureRow(doc, data, y);

    // 9. Add footers to all pages
    this.addFootersToAllPages(doc);

    return doc.output('blob');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drawing Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private drawBrandHeader(doc: jsPDF, startY: number): number {
    let y = startY;

    // Brand Geometric Logo (crisp vector paths)
    doc.setDrawColor(this.gold.r, this.gold.g, this.gold.b);
    doc.setLineWidth(0.8);
    const lx = this.margin;
    const ly = y;
    const size = 12;

    // Isometric grid / stone facet pattern
    doc.line(lx, ly + 3, lx + size, ly + size - 3);
    doc.line(lx + 2, ly, lx + size - 2, ly + size);
    doc.line(lx + 4, ly, lx + size, ly + size - 4);
    doc.line(lx + size, ly + 3, lx, ly + size - 3);
    doc.line(lx + size - 2, ly, lx + 2, ly + size);
    doc.line(lx + size - 4, ly, lx, ly + size - 4);

    // Brand Name & Tagline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text('LUSSO GRANITE', this.margin + size + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text('Artisanal Stone Fabrication & Installation', this.margin + size + 4, y + 10.5);

    // Right-aligned header metadata
    const rightEdge = this.margin + this.contentWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(this.gold.r, this.gold.g, this.gold.b);
    doc.text('Project Consultation Specification', rightEdge, y + 3, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text('Clarksville, TN  |  (931) 896-2245', rightEdge, y + 7.5, { align: 'right' });

    const todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text(`Date: ${todayDate}`, rightEdge, y + 11.5, { align: 'right' });

    // Gold accent horizontal dividing line
    y += 15;
    doc.setDrawColor(this.gold.r, this.gold.g, this.gold.b);
    doc.setLineWidth(0.6);
    doc.line(this.margin, y, rightEdge, y);

    return y + 3;
  }

  private drawSectionTitle(doc: jsPDF, title: string, subtitle: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text(title.toUpperCase(), this.margin, y + 3.5);

    const titleWidth = doc.getTextWidth(title.toUpperCase());
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text(`—  ${subtitle}`, this.margin + titleWidth + 3, y + 3.5);

    // Subtle bottom line for section heading
    doc.setDrawColor(this.border.r, this.border.g, this.border.b);
    doc.setLineWidth(0.2);
    doc.line(this.margin, y + 5.5, this.margin + this.contentWidth, y + 5.5);

    return y + 7.5;
  }

  private drawCustomerInfo(doc: jsPDF, data: PdfFormData, startY: number): number {
    let y = this.drawSectionTitle(doc, '1. Customer Information', 'Client details', startY);

    const rowHeight = 9.5;
    const colWidth = this.contentWidth / 3;

    // Card background
    doc.setFillColor(this.light.r, this.light.g, this.light.b);
    doc.setDrawColor(this.border.r, this.border.g, this.border.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(this.margin, y, this.contentWidth, rowHeight * 2, 1.5, 1.5, 'FD');

    // Horizontal divider between rows
    doc.line(this.margin, y + rowHeight, this.margin + this.contentWidth, y + rowHeight);

    // Vertical dividers between columns
    doc.line(this.margin + colWidth, y, this.margin + colWidth, y + rowHeight * 2);
    doc.line(this.margin + colWidth * 2, y, this.margin + colWidth * 2, y + rowHeight * 2);

    // Row 1
    this.drawFieldCell(doc, 'FIRST NAME', data.firstName, this.margin, y, colWidth, rowHeight);
    this.drawFieldCell(doc, 'LAST NAME', data.lastName, this.margin + colWidth, y, colWidth, rowHeight);
    this.drawFieldCell(doc, 'MIDDLE INITIAL', data.middleInitial, this.margin + colWidth * 2, y, colWidth, rowHeight);

    // Row 2
    this.drawFieldCell(doc, 'PHONE NUMBER', data.phone, this.margin, y + rowHeight, colWidth, rowHeight);
    this.drawFieldCell(doc, 'SECONDARY PHONE', data.secondaryPhone, this.margin + colWidth, y + rowHeight, colWidth, rowHeight);
    this.drawFieldCell(doc, 'EMAIL ADDRESS', data.email, this.margin + colWidth * 2, y + rowHeight, colWidth, rowHeight);

    return y + rowHeight * 2 + 3.5;
  }

  private drawProjectAddress(doc: jsPDF, data: PdfFormData, startY: number): number {
    let y = this.drawSectionTitle(doc, '2. Project Address & Site Details', 'Installation location', startY);

    const rowHeight = 9.5;
    const totalRows = 3;

    // Card background
    doc.setFillColor(this.light.r, this.light.g, this.light.b);
    doc.setDrawColor(this.border.r, this.border.g, this.border.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(this.margin, y, this.contentWidth, rowHeight * totalRows, 1.5, 1.5, 'FD');

    // Row dividers
    doc.line(this.margin, y + rowHeight, this.margin + this.contentWidth, y + rowHeight);
    doc.line(this.margin, y + rowHeight * 2, this.margin + this.contentWidth, y + rowHeight * 2);

    // Row 1: Street Address (Full width)
    this.drawFieldCell(doc, 'STREET ADDRESS', data.streetAddress, this.margin, y, this.contentWidth, rowHeight);

    // Row 2: City (30%), State (20%), ZIP (25%), Lot Number (25%)
    const c1 = this.contentWidth * 0.32;
    const c2 = this.contentWidth * 0.20;
    const c3 = this.contentWidth * 0.24;
    const c4 = this.contentWidth * 0.24;

    const y2 = y + rowHeight;
    doc.line(this.margin + c1, y2, this.margin + c1, y2 + rowHeight);
    doc.line(this.margin + c1 + c2, y2, this.margin + c1 + c2, y2 + rowHeight);
    doc.line(this.margin + c1 + c2 + c3, y2, this.margin + c1 + c2 + c3, y2 + rowHeight);

    this.drawFieldCell(doc, 'CITY', data.city, this.margin, y2, c1, rowHeight);
    this.drawFieldCell(doc, 'STATE', data.state, this.margin + c1, y2, c2, rowHeight);
    this.drawFieldCell(doc, 'ZIP CODE', data.zipCode, this.margin + c1 + c2, y2, c3, rowHeight);
    this.drawFieldCell(doc, 'LOT NUMBER', data.lotNumber, this.margin + c1 + c2 + c3, y2, c4, rowHeight);

    // Row 3: Subdivision (50%), Contractor / Builder (50%)
    const halfWidth = this.contentWidth / 2;
    const y3 = y + rowHeight * 2;
    doc.line(this.margin + halfWidth, y3, this.margin + halfWidth, y3 + rowHeight);

    this.drawFieldCell(doc, 'SUBDIVISION', data.subdivision, this.margin, y3, halfWidth, rowHeight);
    this.drawFieldCell(doc, 'CONTRACTOR / BUILDER', data.contractorBuilder, this.margin + halfWidth, y3, halfWidth, rowHeight);

    return y + rowHeight * totalRows + 3.5;
  }

  private drawScopeAndProjectTypes(doc: jsPDF, data: PdfFormData, startY: number): number {
    let y = this.drawSectionTitle(doc, '3. Scope & Project Type', 'Selected site conditions', startY);

    const options = [
      { key: 'newCabinets', label: 'New Cabinets', sub: 'Ready for template' },
      { key: 'preExistingCabinets', label: 'Existing Cabinets', sub: 'Existing structural' },
      { key: 'remodel', label: 'Remodel / Renovation', sub: 'Updating layout' },
      { key: 'removeExistingCounters', label: 'Tear Out & Removal', sub: 'Demolition required' },
    ];

    const gap = 2;
    const cardWidth = (this.contentWidth - gap * 3) / 4;
    const cardHeight = 11.5;

    options.forEach((opt, idx) => {
      const isSelected = data.projectTypes?.includes(opt.key);
      const cardX = this.margin + idx * (cardWidth + gap);

      if (isSelected) {
        doc.setFillColor(this.goldPale.r, this.goldPale.g, this.goldPale.b);
        doc.setDrawColor(this.gold.r, this.gold.g, this.gold.b);
        doc.setLineWidth(0.4);
      } else {
        doc.setFillColor(this.light.r, this.light.g, this.light.b);
        doc.setDrawColor(this.border.r, this.border.g, this.border.b);
        doc.setLineWidth(0.2);
      }

      doc.roundedRect(cardX, y, cardWidth, cardHeight, 1.2, 1.2, 'FD');

      // Checkbox square
      const boxSize = 3.2;
      const boxX = cardX + 2.5;
      const boxY = y + 2.5;
      if (isSelected) {
        doc.setFillColor(this.gold.r, this.gold.g, this.gold.b);
        doc.setDrawColor(this.gold.r, this.gold.g, this.gold.b);
        doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.6, 0.6, 'FD');
        // Checkmark
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(boxX + 0.7, boxY + 1.6, boxX + 1.4, boxY + 2.4);
        doc.line(boxX + 1.4, boxY + 2.4, boxX + 2.6, boxY + 0.8);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(this.border.r, this.border.g, this.border.b);
        doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.6, 0.6, 'FD');
      }

      // Chip title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(isSelected ? this.dark.r : this.muted.r, isSelected ? this.dark.g : this.muted.g, isSelected ? this.dark.b : this.muted.b);
      doc.text(opt.label, cardX + 7, y + 4.8);

      // Chip subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
      doc.text(opt.sub, cardX + 2.5, y + 9);
    });

    return y + cardHeight + 3.5;
  }

  private drawAreasTable(doc: jsPDF, areas: AreaItem[], startY: number): number {
    let y = this.drawSectionTitle(doc, '4. Project Areas & Specifications', 'Countertop specifications per area', startY);

    const cols = [
      { header: 'Area Type', width: 28 },
      { header: 'Color / Material', width: 34 },
      { header: 'Edge Style', width: 25 },
      { header: 'Sink Type', width: 25 },
      { header: 'Backsplash', width: 24 },
      { header: 'Faucet Type', width: 25 },
      { header: 'Stove Type', width: 25 },
    ];

    const headerHeight = 6.5;

    // Table Header Bar (Dark Slate)
    doc.setFillColor(this.headerDark.r, this.headerDark.g, this.headerDark.b);
    doc.roundedRect(this.margin, y, this.contentWidth, headerHeight, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    let curX = this.margin;
    cols.forEach((col) => {
      doc.text(col.header, curX + 2.5, y + 4.5);
      curX += col.width;
    });

    y += headerHeight;

    if (!areas || areas.length === 0) {
      // Empty state
      const emptyHeight = 8;
      doc.setFillColor(this.light.r, this.light.g, this.light.b);
      doc.setDrawColor(this.border.r, this.border.g, this.border.b);
      doc.rect(this.margin, y, this.contentWidth, emptyHeight, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
      doc.text('No configured project areas.', this.margin + 4, y + 5.2);
      return y + emptyHeight + 3.5;
    }

    // Rows
    const rowHeight = 7.2;
    areas.forEach((area, index) => {
      // Alternating background
      if (index % 2 === 1) {
        doc.setFillColor(this.light.r, this.light.g, this.light.b);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(this.border.r, this.border.g, this.border.b);
      doc.setLineWidth(0.2);
      doc.rect(this.margin, y, this.contentWidth, rowHeight, 'FD');

      const material = area.colorMaterial === 'Other'
        ? (area.customColorMaterial || 'Other')
        : (area.colorMaterial || '—');

      const rowValues = [
        area.areaType || '—',
        material,
        area.edgeStyle || '—',
        area.sinkType || '—',
        area.backsplashHeight || '—',
        area.faucetType || '—',
        area.stoveType || '—',
      ];

      curX = this.margin;
      cols.forEach((col, cIdx) => {
        const val = rowValues[cIdx];
        if (cIdx === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(this.mid.r, this.mid.g, this.mid.b);
        }
        doc.setFontSize(6.7);
        // Truncate if too long for column
        const maxTextWidth = col.width - 4;
        let displayVal = val;
        while (displayVal.length > 3 && doc.getTextWidth(displayVal) > maxTextWidth) {
          displayVal = displayVal.slice(0, -2) + '…';
        }
        doc.text(displayVal, curX + 2.5, y + 4.8);
        curX += col.width;
      });

      y += rowHeight;
    });

    return y + 3.5;
  }

  private drawNotesSection(doc: jsPDF, splitLines: string[], boxHeight: number, startY: number): number {
    let y = this.drawSectionTitle(doc, '5. Project Notes & Special Instructions', 'Estimator & client instructions', startY);

    doc.setFillColor(this.light.r, this.light.g, this.light.b);
    doc.setDrawColor(this.border.r, this.border.g, this.border.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(this.margin, y, this.contentWidth, boxHeight, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(this.mid.r, this.mid.g, this.mid.b);

    let textY = y + 4.5;
    splitLines.forEach((line) => {
      doc.text(line, this.margin + 3.5, textY);
      textY += 4.2;
    });

    return y + boxHeight + 3.5;
  }

  private drawTermsSection(doc: jsPDF, startY: number): number {
    let y = this.drawSectionTitle(doc, '6. Terms of Service & Policies', 'Lusso Granite Policies', startY);

    const halfWidth = (this.contentWidth - 4) / 2;

    const col1 = [
      '• We do not seal any natural stone.',
      '• We do not do any plumbing or electrical work.',
    ];
    const col2 = [
      '• Please pull out appliances prior to installation.',
      '• We do not supply any plumbing accessories.',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(this.mid.r, this.mid.g, this.mid.b);

    let ty = y + 2.5;
    col1.forEach((item, i) => {
      doc.text(item, this.margin + 2, ty + i * 4.2);
    });
    col2.forEach((item, i) => {
      doc.text(item, this.margin + halfWidth + 4, ty + i * 4.2);
    });

    ty += 9.5;

    // Payment callout highlight box
    const calloutHeight = 9.5;
    doc.setFillColor(this.goldPale.r, this.goldPale.g, this.goldPale.b);
    doc.setDrawColor(this.goldBorder.r, this.goldBorder.g, this.goldBorder.b);
    doc.setLineWidth(0.3);
    doc.roundedRect(this.margin, ty, this.contentWidth, calloutHeight, 1.2, 1.2, 'FD');

    // Bullet 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(this.gold.r, this.gold.g, this.gold.b);
    doc.text('*', this.margin + 3, ty + 4.2);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text('50% down payment', this.margin + 6, ty + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.mid.r, this.mid.g, this.mid.b);
    doc.text('required upon job approval.', this.margin + 31, ty + 4.2);

    // Bullet 2
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.gold.r, this.gold.g, this.gold.b);
    doc.text('*', this.margin + halfWidth + 4, ty + 4.2);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text('Please have jobsite ready', this.margin + halfWidth + 7, ty + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.mid.r, this.mid.g, this.mid.b);
    doc.text('on the day of installation.', this.margin + halfWidth + 37, ty + 4.2);

    return ty + calloutHeight + 4;
  }

  private drawSignatureRow(doc: jsPDF, data: PdfFormData, startY: number): number {
    const y = startY + 2;
    const colWidth = (this.contentWidth - 8) / 3;

    // 1. Customer Signature Box
    const col1X = this.margin;
    const sigBoxHeight = 16;
    if (data.signature) {
      try {
        doc.addImage(data.signature, 'PNG', col1X + 2, y, colWidth - 4, sigBoxHeight - 2);
      } catch (err) {
        console.warn('Could not render signature image onto PDF', err);
      }
    }

    doc.setDrawColor(this.dark.r, this.dark.g, this.dark.b);
    doc.setLineWidth(0.35);
    doc.line(col1X, y + sigBoxHeight, col1X + colWidth, y + sigBoxHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text('CUSTOMER SIGNATURE', col1X, y + sigBoxHeight + 4);

    // 2. Date Box
    const col2X = col1X + colWidth + 4;
    const sigDate = data.signatureDate || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    doc.text(sigDate, col2X + 2, y + sigBoxHeight - 2);

    doc.setDrawColor(this.dark.r, this.dark.g, this.dark.b);
    doc.setLineWidth(0.35);
    doc.line(col2X, y + sigBoxHeight, col2X + colWidth, y + sigBoxHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text('DATE', col2X, y + sigBoxHeight + 4);

    // 3. Representative Signature Line
    const col3X = col2X + colWidth + 4;
    doc.setDrawColor(this.dark.r, this.dark.g, this.dark.b);
    doc.setLineWidth(0.35);
    doc.line(col3X, y + sigBoxHeight, col3X + colWidth, y + sigBoxHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text('LUSSO REPRESENTATIVE SIGNATURE', col3X, y + sigBoxHeight + 4);

    return y + sigBoxHeight + 8;
  }

  private drawFieldCell(
    doc: jsPDF,
    label: string,
    value: string | undefined | null,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
    doc.text(label, x + 2.5, y + 3.6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(this.dark.r, this.dark.g, this.dark.b);
    const displayVal = value && String(value).trim() ? String(value).trim() : '—';
    doc.text(displayVal, x + 2.5, y + 7.5);
  }

  private ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
    if (currentY + neededHeight > this.pageHeight - this.footerHeight - this.margin) {
      doc.addPage();
      return this.margin + 4;
    }
    return currentY;
  }

  private addFootersToAllPages(doc: jsPDF): void {
    const totalPages = doc.getNumberOfPages();
    const rightEdge = this.margin + this.contentWidth;
    const footerY = this.pageHeight - this.margin;

    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);

      // Gold / border rule
      doc.setDrawColor(this.gold.r, this.gold.g, this.gold.b);
      doc.setLineWidth(0.3);
      doc.line(this.margin, footerY - 4.5, rightEdge, footerY - 4.5);

      // Left
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(this.gold.r, this.gold.g, this.gold.b);
      doc.text('LUSSO GRANITE', this.margin, footerY);

      // Center
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(this.muted.r, this.muted.g, this.muted.b);
      doc.text(
        'Clarksville, TN  ·  (931) 896-2245  ·  sales@lussogranite.com',
        this.pageWidth / 2,
        footerY,
        { align: 'center' },
      );

      // Right: Page numbers if multi-page
      if (totalPages > 1) {
        doc.text(`Page ${i} of ${totalPages}`, rightEdge, footerY, { align: 'right' });
      } else {
        doc.text('Artisanal Stone Fabrication & Installation', rightEdge, footerY, { align: 'right' });
      }
    }
  }
}
