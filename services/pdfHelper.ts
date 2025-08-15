
import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EditableElement, PageInfo, TextElement, SignatureElement, SymbolElement } from '../types';

declare const pdfjsLib: any;

// Caching for fetched fonts to avoid re-downloading on every export.
const fontCache: { [key: string]: { promise: Promise<ArrayBuffer>, bytes: ArrayBuffer | null } } = {};

const getFontBytes = async (style: 'regular' | 'bold' | 'italic' | 'bold-italic'): Promise<ArrayBuffer> => {
    if (fontCache[style]?.bytes) {
        return fontCache[style].bytes!;
    }

    if (fontCache[style]?.promise) {
        return fontCache[style].promise;
    }

    const styleToUrlMap = {
        'regular': 'https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf',
        'bold': 'https://pdf-lib.js.org/assets/ubuntu/Ubuntu-B.ttf',
        'italic': 'https://pdf-lib.js.org/assets/ubuntu/Ubuntu-I.ttf',
        'bold-italic': 'https://pdf-lib.js.org/assets/ubuntu/Ubuntu-BI.ttf',
    };

    const fontUrl = styleToUrlMap[style];
    const promise = fetch(fontUrl).then(res => {
        if (!res.ok) {
            throw new Error(`Failed to fetch font: ${res.statusText}`);
        }
        return res.arrayBuffer()
    });
    fontCache[style] = { promise, bytes: null };
    
    try {
        const bytes = await promise;
        fontCache[style].bytes = bytes;
        return bytes;
    } catch(e) {
        // If fetch fails, remove from cache to allow retry on next attempt
        delete fontCache[style];
        throw e;
    }
};

const getPdfFont = async (pdfDoc: PDFDocument, fontFamily: string, isBold: boolean, isItalic: boolean): Promise<PDFFont> => {
    let style: 'regular' | 'bold' | 'italic' | 'bold-italic' = 'regular';
    if (isBold && isItalic) {
        style = 'bold-italic';
    } else if (isBold) {
        style = 'bold';
    } else if (isItalic) {
        style = 'italic';
    }
    
    // We embed the Ubuntu font family to support a wide range of Unicode characters,
    // which fixes errors with non-Latin scripts (e.g., Cyrillic). The user's font
    // family selection is visually approximated by using this single, versatile font.
    const fontBytes = await getFontBytes(style);

    // With fontkit registered, pdf-lib will automatically create a subset of the font
    // containing only the glyphs used in the document. This optimizes file size.
    return await pdfDoc.embedFont(fontBytes);
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
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // Register fontkit with this PDFDocument instance.
    // This is necessary to embed custom fonts like Ubuntu for Unicode support.
    // We cast to `any` because the type definitions might not include `registerFontkit`.
    (pdfDoc as any).registerFontkit(fontkit);

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
            } else if (element.type === 'symbol') {
                const symbolElement = element as SymbolElement;
                if (symbolElement.symbolType === 'checkmark') {
                    // SVG path for a checkmark from a 24x24 viewBox
                    const checkmarkPath = 'M20 6L9 17l-5-5';
                    
                    const elWidth = element.width * scaleX;
                    const elHeight = element.height * scaleY;
                    const elX = element.x * scaleX;
                    const elY = y_top_pdf - elHeight;

                    const scale = Math.min(elWidth / 24, elHeight / 24);
                    
                    const scaledWidth = 24 * scale;
                    const scaledHeight = 24 * scale;

                    const offsetX = (elWidth - scaledWidth) / 2;
                    const offsetY = (elHeight - scaledHeight) / 2;
                    
                    page.drawSvgPath(checkmarkPath, {
                        x: elX + offsetX,
                        y: elY + offsetY,
                        scale: scale,
                        borderColor: rgb(0, 0, 0),
                        borderWidth: 2,
                    });
                }
            }
        }
    }

    return await pdfDoc.save();
};
