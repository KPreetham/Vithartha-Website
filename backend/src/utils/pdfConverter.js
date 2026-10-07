import { PDFDocument } from "pdf-lib";

const isPdf = (buf) => buf.length > 4 && buf.subarray(0, 4).toString("latin1") === "%PDF";
const isPng = (buf) => buf.length > 8 && buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG";
const isJpeg = (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

const swapExtensionToPdf = (filename) =>
  `${String(filename || "document").replace(/\.[a-z0-9]{2,5}$/i, "")}.pdf`;

// Wraps a JPG/PNG in a single-page PDF sized to the image.
async function imageToPdf(buffer, embedPng) {
  const pdf = await PDFDocument.create();
  const image = embedPng ? await pdf.embedPng(buffer) : await pdf.embedJpg(buffer);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return Buffer.from(await pdf.save());
}

// Ensures an attachment ({ filename, content: Buffer }) is a PDF. PDFs pass
// through untouched, JPG/PNG are converted. Formats that cannot be converted
// faithfully without an office suite (DOC/DOCX, ...) are returned unchanged
// with `converted: false` so the caller can still deliver the original file.
export async function ensurePdfAttachment(attachment) {
  const { filename, content } = attachment;
  try {
    if (isPdf(content)) {
      return { filename: swapExtensionToPdf(filename), content, converted: true };
    }
    if (isPng(content) || isJpeg(content)) {
      const pdfBuffer = await imageToPdf(content, isPng(content));
      return { filename: swapExtensionToPdf(filename), content: pdfBuffer, converted: true };
    }
  } catch (err) {
    console.error(`[PdfConverter] Failed to convert "${filename}": ${err.message}`);
  }
  return { filename, content, converted: false };
}
