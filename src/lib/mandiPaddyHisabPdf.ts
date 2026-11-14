import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Exports a DOM element to a multi-page A4 PDF cleanly without window.open popups.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });

  const imgWidth = usableWidth;
  const imgHeight = (img.height * imgWidth) / img.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= usableHeight;

  while (heightLeft > 1) {
    pdf.addPage();
    position = margin - (imgHeight - heightLeft);
    pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= usableHeight;
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
