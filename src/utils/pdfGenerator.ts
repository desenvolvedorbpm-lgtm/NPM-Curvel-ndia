import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import html2canvas from "html2canvas";

export async function exportElementToPdf(elementId: string, filename: string = "escala-servico-pmmt.pdf") {
  const container = document.getElementById(elementId);
  if (!container) {
    throw new Error(`Element with id '${elementId}' not found for PDF export.`);
  }

  // Find all page sheets inside the container (e.g. Page 1, Page 2)
  const pageElements = Array.from(container.querySelectorAll<HTMLElement>(".pdf-page-sheet"));
  const targets = pageElements.length > 0 ? pageElements : [container];

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  for (let i = 0; i < targets.length; i++) {
    const pageElem = targets[i];

    if (i > 0) {
      pdf.addPage();
    }

    let imgData: string | null = null;
    let imgWidthPx = 0;
    let imgHeightPx = 0;

    try {
      // 1. Primary: html-to-image (renders Tailwind v4 oklch colors natively via SVG foreignObject)
      imgData = await toPng(pageElem, {
        quality: 0.98,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
        style: {
          boxShadow: "none",
          margin: "0",
          border: "none"
        }
      });

      const tempImg = new Image();
      tempImg.src = imgData;
      await new Promise<void>((resolve, reject) => {
        tempImg.onload = () => resolve();
        tempImg.onerror = (e) => reject(e);
      });
      imgWidthPx = tempImg.width;
      imgHeightPx = tempImg.height;

    } catch (toPngErr) {
      console.warn(`html-to-image failed for page ${i + 1}, trying html2canvas with oklch sanitizer:`, toPngErr);

      // 2. Fallback: html2canvas with cloned document style sanitizer
      const canvas = await html2canvas(pageElem, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Remove/replace oklch color rules in cloned stylesheets
          const styles = clonedDoc.querySelectorAll("style");
          styles.forEach((style) => {
            if (style.innerHTML.includes("oklch")) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, "#1e293b");
            }
          });
        }
      });

      imgData = canvas.toDataURL("image/png");
      imgWidthPx = canvas.width;
      imgHeightPx = canvas.height;
    }

    if (imgData && imgWidthPx > 0 && imgHeightPx > 0) {
      const renderedHeightMm = (imgHeightPx * pdfWidth) / imgWidthPx;

      if (renderedHeightMm <= pdfHeight + 2) {
        // Fits cleanly on a single page
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, renderedHeightMm);
      } else {
        // Multi-page sliding slice for longer page sheets so no tables or sections are cut off
        let heightLeftMm = renderedHeightMm;
        let positionMm = 0;

        pdf.addImage(imgData, "PNG", 0, positionMm, pdfWidth, renderedHeightMm);
        heightLeftMm -= pdfHeight;

        while (heightLeftMm > 2) {
          positionMm -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, positionMm, pdfWidth, renderedHeightMm);
          heightLeftMm -= pdfHeight;
        }
      }
    }
  }

  pdf.save(filename);
}

export function printScaleDocument() {
  window.print();
}

