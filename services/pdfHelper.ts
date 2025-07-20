
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EditableElement, PageInfo, TextElement, SignatureElement } from '../types';

declare const pdfjsLib: any;
declare const PDFLib: any;

export const loadPdfPages = async (pdfBytes: ArrayBuffer): Promise<PageInfo[]> => {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const pagesInfo: PageInfo[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Use a higher scale for better quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            pagesInfo.push({
                dataUrl: canvas.toDataURL(),
                width: viewport.width,
                height: viewport.height,
            });
        }
    }
    return pagesInfo;
};

export const savePdf = async (
    originalPdfBytes: ArrayBuffer,
    elements: EditableElement[],
    pagesInfo: PageInfo[]
): Promise<Uint8Array> => {
    const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageInfo = pagesInfo[i];
        const pageElements = elements.filter(el => el.pageIndex === i);
        
        const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
        const scaleX = pdfPageWidth / pageInfo.width;
        const scaleY = pdfPageHeight / pageInfo.height;

        for (const element of pageElements) {
            const y = page.getHeight() - (element.y * scaleY) - (element.height * scaleY);
            
            if (element.type === 'text') {
                const textElement = element as TextElement;
                page.drawText(textElement.text, {
                    x: element.x * scaleX,
                    y: y + (element.height * scaleY / 2) - (textElement.fontSize * scaleY / 2) + 2, // Approximate vertical centering
                    font,
                    size: textElement.fontSize * scaleY,
                    color: rgb(0, 0, 0),
                });
            } else if (element.type === 'signature') {
                const signatureElement = element as SignatureElement;
                const imageBytes = await fetch(signatureElement.imageData).then(res => res.arrayBuffer());
                const image = await pdfDoc.embedPng(imageBytes);
                page.drawImage(image, {
                    x: element.x * scaleX,
                    y: y,
                    width: element.width * scaleX,
                    height: element.height * scaleY,
                });
            }
        }
    }

    return await pdfDoc.save();
};