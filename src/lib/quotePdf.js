import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Gera PDF A4 a partir de um elemento HTML (com multipágina).
 * @param {HTMLElement} el - container que será renderizado
 * @param {string} filename - nome do arquivo
 */
export async function exportElementToPdf(el, filename = "cotacao.pdf") {
  if (!el) throw new Error("Elemento de impressão não encontrado.");

  // garante fundo branco
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // calcula tamanho proporcional
  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  let y = 0;
  let remaining = imgHeight;

  pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
  remaining -= pageHeight;

  // multipágina
  while (remaining > 0) {
    pdf.addPage();
    y = -(imgHeight - remaining);
    pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
    remaining -= pageHeight;
  }

  pdf.save(filename);
}