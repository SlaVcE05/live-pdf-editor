
import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import { EditableElement, PageInfo, TextElement, SignatureElement } from '../types';

declare const pdfjsLib: any;
declare const PDFLib: any;

const getPdfFont = async (pdfDoc: any, fontFamily: string, isBold: boolean, isItalic: boolean): Promise<PDFFont> => {
    let font = StandardFonts.Helvetica;

    if (fontFamily === 'Times New Roman') {
        if (isBold && isItalic) font = StandardFonts.TimesRomanBoldItalic;
        else if (isBold) font = StandardFonts.TimesRomanBold;
        else if (isItalic) font = StandardFonts.TimesRomanItalic;
        else font = StandardFonts.TimesRoman;
    } else if (fontFamily === 'Courier') {
        if (isBold && isItalic) font = StandardFonts.CourierBoldOblique;
        else if (isBold) font = StandardFonts.CourierBold;
        else if (isItalic) font = StandardFonts.CourierOblique;
        else font = StandardFonts.Courier;
    } else { // Default to Helvetica for Arial, Verdana, etc.
        if (isBold && isItalic) font = StandardFonts.HelveticaBoldOblique;
        else if (isBold) font = StandardFonts.HelveticaBold;
        else if (isItalic) font = StandardFonts.HelveticaOblique;
        else font = StandardFonts.Helvetica;
    }

    return await pdfDoc.embedFont(font);
};


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
    originalPdfBytes: Uint8Array,
    elements: EditableElement[],
    pagesInfo: PageInfo[]
): Promise<Uint8Array> => {
    const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();

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
                const font = await getPdfFont(pdfDoc, textElement.fontFamily, textElement.isBold, textElement.isItalic);
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