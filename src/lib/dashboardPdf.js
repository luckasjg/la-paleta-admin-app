import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import moment from 'moment';

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 10;
const HEADER_H = 20;
const BRAND = 'La Paleta';
const BRAND_RGB = [122, 35, 35]; // primary — rojo corporativo

/** Ancho en px del contenedor oculto para que 1 página A4 calce completa. */
export const PDF_RENDER_WIDTH = 794;

const contentWidth = () => PAGE_W - MARGIN * 2;

function drawHeader(pdf, title, subtitle) {
  pdf.setFillColor(...BRAND_RGB);
  pdf.rect(0, 0, PAGE_W, HEADER_H, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(BRAND, MARGIN, 9);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(String(title || ''), MARGIN, 15.5);
  if (subtitle) {
    pdf.setFontSize(8);
    pdf.text(String(subtitle), PAGE_W - MARGIN, 15.5, { align: 'right' });
  }
  pdf.setTextColor(30, 30, 30);
}

function drawFooter(pdf, pageNumber) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(140, 140, 140);
  pdf.text(`Generado ${moment().format('DD/MM/YYYY HH:mm')}`, MARGIN, PAGE_H - 5);
  pdf.text(`Página ${pageNumber}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
  pdf.setTextColor(30, 30, 30);
}

async function captureElement(el) {
  return html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });
}

/** Espera a que los gráficos terminen de animarse antes de capturar. */
export const waitForRender = (ms = 900) => new Promise(r => setTimeout(r, ms));

/**
 * Añade el contenido de un elemento del DOM al PDF, paginándolo verticalmente
 * tantas páginas como haga falta. Cada página lleva encabezado y pie.
 */
async function appendElement(pdf, el, { title, subtitle, startNewPage, pageCounter }) {
  const canvas = await captureElement(el);
  const cw = contentWidth();
  const pxPerMm = canvas.width / cw;
  const availMm = PAGE_H - HEADER_H - 4 - MARGIN - 4;
  const sliceMaxPx = availMm * pxPerMm;

  let offset = 0;
  let first = true;
  while (offset < canvas.height) {
    if (!first || startNewPage) pdf.addPage();
    first = false;
    pageCounter.value += 1;
    drawHeader(pdf, title, subtitle);

    const sliceH = Math.min(canvas.height - offset, sliceMaxPx);
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = sliceH;
    const ctx = tmp.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    pdf.addImage(tmp.toDataURL('image/jpeg', 0.94), 'JPEG', MARGIN, HEADER_H + 4, cw, sliceH / pxPerMm);
    drawFooter(pdf, pageCounter.value);
    offset += sliceH;
  }
}

/** Exporta una sola vista ampliada (gráfico + tablas) a un PDF de una o más páginas. */
export async function exportElementToPdf(el, { title, subtitle, fileName }) {
  if (!el) throw new Error('No hay contenido para exportar');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  await appendElement(pdf, el, { title, subtitle, startNewPage: false, pageCounter: { value: 0 } });
  pdf.save(fileName);
}

function drawCover(pdf, { periodLabel, sectionTitles }) {
  pdf.setFillColor(...BRAND_RGB);
  pdf.rect(0, 0, PAGE_W, 70, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.text(BRAND, MARGIN, 34);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.text('Reporte de Indicadores', MARGIN, 46);
  pdf.setFontSize(10);
  pdf.text(periodLabel, MARGIN, 56);

  pdf.setTextColor(40, 40, 40);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Contenido del reporte', MARGIN, 90);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  sectionTitles.forEach((t, i) => {
    pdf.text(`${i + 1}.  ${t}`, MARGIN + 2, 100 + i * 7);
  });

  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 140);
  pdf.text(`Generado el ${moment().format('DD/MM/YYYY [a las] HH:mm')}`, MARGIN, PAGE_H - 14);
  pdf.text('Documento interno — datos operativos y financieros', MARGIN, PAGE_H - 9);
}

/**
 * Compila el PDF consolidado: portada + una sección por bloque elegido.
 * `sections` = [{ id, title, element }] en el orden en que deben salir.
 */
export async function exportDashboardToPdf({ sections, periodLabel, fileName }) {
  const usable = sections.filter(s => s.element);
  if (usable.length === 0) throw new Error('No hay secciones para exportar');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  drawCover(pdf, { periodLabel, sectionTitles: usable.map(s => s.title) });

  const pageCounter = { value: 1 };
  for (const section of usable) {
    await appendElement(pdf, section.element, {
      title: section.title,
      subtitle: periodLabel,
      startNewPage: true,
      pageCounter,
    });
  }
  pdf.save(fileName);
}