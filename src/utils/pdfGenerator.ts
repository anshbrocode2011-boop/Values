import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BloxFruitItem, SyncStatus } from '../types';
import { formatDateTime } from './formatters';

export interface GeneratePdfOptions {
  items: BloxFruitItem[];
  status: SyncStatus;
}

export async function generateBloxFruitsPdf({ items, status }: GeneratePdfOptions): Promise<void> {
  if (!items || items.length === 0) {
    throw new Error('No items available to generate report. Please synchronize data first.');
  }

  // Filter items by category
  const fruits = items
    .filter((i) => i.category === 'Fruits')
    .sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0) || a.position - b.position);

  const gamepasses = items
    .filter((i) => i.category === 'Gamepasses')
    .sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0) || a.position - b.position);

  const limiteds = items
    .filter((i) => i.category === 'Limiteds')
    .sort((a, b) => (b.physicalValue ?? 0) - (a.physicalValue ?? 0) || a.position - b.position);

  // Initialize Landscape A4 (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const generatedTime = formatDateTime(new Date().toISOString());
  const syncTime = formatDateTime(status.lastSuccessfulSync);

  // 1. Cover / Header Banner
  doc.setFillColor(248, 250, 252); // Light slate background for summary
  doc.rect(14, 12, pageWidth - 28, 38, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 12, pageWidth - 28, 38, 'S');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('BLOX FRUITS VALUES REPORT', 20, 22);

  // Source attribution & verified pill
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Official Source: https://bloxfruitsvalues.com/values`, 20, 29);
  doc.text(`Generated: ${generatedTime}   |   Last Source Sync: ${syncTime}`, 20, 35);
  doc.text(`Total Tracked Items: ${items.length}   (Fruits: ${fruits.length}   ·   Gamepasses: ${gamepasses.length}   ·   Limiteds / Skins: ${limiteds.length})`, 20, 42);

  // Summary badges on top right
  doc.setFillColor(37, 99, 235); // Blue primary accent
  doc.rect(pageWidth - 62, 18, 42, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('LIVE VERIFIED', pageWidth - 55, 24.5);

  let startY = 56;

  // 2. Table 1: Fruits
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`1. Devil Fruits (${fruits.length} items)`, 14, startY);
  startY += 4;

  const fruitRows = fruits.map((f, idx) => [
    `${idx + 1}. ${f.name}`,
    f.rarity || 'Common',
    f.physicalValueFormatted || 'N/A',
    f.permanentValueFormatted || 'N/A',
    f.physicalDemand !== null ? `${f.physicalDemand}/10` : 'N/A',
    f.physicalTrend || 'Stable',
    f.beliPriceFormatted || 'N/A',
    f.fruitType || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [['Item Name', 'Rarity', 'Physical Value', 'Permanent Value', 'Demand', 'Trend', 'Beli Price', 'Fruit Type']],
    body: fruitRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175], // Blue-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 32, fontStyle: 'bold', textColor: [37, 99, 235] },
      3: { cellWidth: 32, fontStyle: 'bold', textColor: [124, 58, 237] },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 26 },
      6: { cellWidth: 26 },
      7: { cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  // 3. Table 2: Gamepasses
  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // Check if we need a new page for Gamepasses section
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text(`2. Gamepasses (${gamepasses.length} items)`, 14, finalY);
  finalY += 4;

  const gpRows = gamepasses.map((g, idx) => [
    `${idx + 1}. ${g.name}`,
    g.rarity || 'Gamepass',
    g.physicalValueFormatted || 'N/A',
    g.physicalDemand !== null ? `${g.physicalDemand}/10` : 'N/A',
    g.physicalTrend || 'Stable',
    g.robuxPrice ? `${g.robuxPrice} R$` : 'N/A',
    g.tradeable ? 'Tradeable' : 'Untradeable',
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [['Item Name', 'Rarity', 'Trading Value', 'Demand', 'Trend', 'Robux Price', 'Status']],
    body: gpRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [37, 99, 235] },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 32 },
      6: { cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  // 4. Table 3: Limiteds & Skins
  finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text(`3. Limited Items & Skins (${limiteds.length} items)`, 14, finalY);
  finalY += 4;

  const limitedRows = limiteds.map((l, idx) => [
    `${idx + 1}. ${l.name}`,
    l.rarity || 'Limited',
    l.physicalValueFormatted || 'N/A',
    l.physicalDemand !== null ? `${l.physicalDemand}/10` : 'N/A',
    l.physicalTrend || 'Stable',
    l.robuxPrice ? `${l.robuxPrice} R$` : 'N/A',
    l.tradeable ? 'Tradeable' : 'Special',
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [['Item Name', 'Rarity', 'Trading Value', 'Demand', 'Trend', 'Robux Price', 'Status']],
    body: limitedRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [37, 99, 235] },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 32 },
      6: { cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  // 5. Header and Footer on Every Page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top subtle header line (pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Blox Fruits Values Report — Source: bloxfruitsvalues.com/values', 14, 10);
      doc.text(`Generated: ${generatedTime}`, pageWidth - 14, 10, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(14, 12, pageWidth - 14, 12);
    }

    // Bottom footer line on all pages
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Source: https://bloxfruitsvalues.com/values — All trading values are dynamically synchronized from live data.', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // File name with clean date
  const cleanDate = new Date().toISOString().slice(0, 10);
  const fileName = `Blox_Fruits_Values_Report_${cleanDate}.pdf`;

  // Save/Download
  doc.save(fileName);
}
