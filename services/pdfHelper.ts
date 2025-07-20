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
            const y_top_pdf = page.getHeight() - (element.y * scaleY);

            if (element.type === 'text') {
                const textElement = element as TextElement;
                const lines = textElement.text.split('\n');
                const fontSize = textElement.fontSize * scaleY;
                const lineHeight = fontSize * 1.2;
                
                lines.forEach((line, lineIndex) => {
                     page.drawText(line, {
                        x: element.x * scaleX,
                        y: y_top_pdf - fontSize - (lineIndex * lineHeight),
                        font,
                        size: fontSize,
                        color: rgb(0, 0, 0),
                    });
                });
            } else if (element.type === 'signature') {
                const signatureElement = element as SignatureElement;
                const imageBytes = await fetch(signatureElement.imageData).then(res => res.arrayBuffer());
                const image = await pdfDoc.embedPng(imageBytes);
                page.drawImage(image, {
                    x: element.x * scaleX,
                    y: y_top_pdf - (element.height * scaleY),
                    width: element.width * scaleX,
                    height: element.height * scaleY,
                });
            }
        }
    }

    return await pdfDoc.save();
};

export const createPdfFromDoc = async (
    elements: EditableElement[],
    pagesInfo: PageInfo[]
): Promise<Uint8Array> => {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < pagesInfo.length; i++) {
        const pageInfo = pagesInfo[i];
        const page = pdfDoc.addPage([pageInfo.width, pageInfo.height]);
        const pageElements = elements.filter(el => el.pageIndex === i);
        
        const pageImageBytes = await fetch(pageInfo.dataUrl).then(res => res.arrayBuffer());
        const pageImage = pageInfo.dataUrl.includes('jpeg') 
            ? await pdfDoc.embedJpg(pageImageBytes) 
            : await pdfDoc.embedPng(pageImageBytes);

        page.drawImage(pageImage, {
            x: 0, y: 0,
            width: page.getWidth(), height: page.getHeight(),
        });
        
        const { height: pdfPageHeight } = page.getSize();

        for (const element of pageElements) {
            const y_top_pdf = pdfPageHeight - element.y;

            if (element.type === 'text') {
                const textElement = element as TextElement;
                const lines = textElement.text.split('\n');
                const fontSize = textElement.fontSize;
                const lineHeight = fontSize * 1.2;

                lines.forEach((line, lineIndex) => {
                    page.drawText(line, {
                        x: element.x,
                        y: y_top_pdf - fontSize - (lineIndex * lineHeight),
                        font,
                        size: fontSize,
                        color: rgb(0, 0, 0),
                    });
                });
            } else if (element.type === 'signature') {
                const signatureElement = element as SignatureElement;
                const imageBytes = await fetch(signatureElement.imageData).then(res => res.arrayBuffer());
                const image = await pdfDoc.embedPng(imageBytes);
                page.drawImage(image, {
                    x: element.x,
                    y: y_top_pdf - element.height,
                    width: element.width,
                    height: element.height,
                });
            }
        }
    }

    return await pdfDoc.save();
};