
import { PageInfo } from '../types';
import { PDFDocument } from 'pdf-lib';

declare const mammoth: any;
declare const html2canvas: any;

const RENDER_WIDTH = 794;
const RENDER_HEIGHT = 1123;

const renderDocxToPages = async (docxBytes: ArrayBuffer): Promise<PageInfo[]> => {
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: docxBytes });

    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-9999px';
    renderContainer.style.top = '-9999px';
    renderContainer.style.width = `${RENDER_WIDTH}px`;
    renderContainer.style.background = 'white';
    renderContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
    renderContainer.innerHTML = `
        <style>
            body, div, p, h1, h2, h3, h4, h5, h6, li, blockquote, td { 
                max-width: 100%; 
                word-wrap: break-word; 
                line-height: 1.4;
                margin: 0;
                padding: 0;
            }
            body { padding: 20px; }
            img, svg { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ccc; padding: 8px; }
        </style>
        ${html}
    `;
    
    document.body.appendChild(renderContainer);
    
    const images = Array.from(renderContainer.getElementsByTagName('img'));
    const imageLoadPromises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });

    await Promise.all(imageLoadPromises);
    await new Promise(resolve => requestAnimationFrame(resolve));

    const pagesInfo: PageInfo[] = [];
    const totalContentHeight = renderContainer.scrollHeight;
    const pageCount = Math.ceil(totalContentHeight / RENDER_HEIGHT) || 1;

    for (let i = 0; i < pageCount; i++) {
        const canvas = await html2canvas(renderContainer, {
            width: RENDER_WIDTH,
            height: RENDER_HEIGHT,
            y: i * RENDER_HEIGHT,
            scale: 1, // Use scale 1 for direct PDF embedding
            backgroundColor: '#ffffff',
            logging: false,
        });
        pagesInfo.push({
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
        });
    }

    document.body.removeChild(renderContainer);
    return pagesInfo;
};

export const convertDocxToPdfBytes = async (docxBytes: ArrayBuffer): Promise<Uint8Array> => {
    const docPages = await renderDocxToPages(docxBytes);
    const pdfDoc = await PDFDocument.create();

    for (const pageInfo of docPages) {
        const page = pdfDoc.addPage([pageInfo.width, pageInfo.height]);
        const pngImageBytes = await fetch(pageInfo.dataUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);
        
        page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
        });
    }
    
    return await pdfDoc.save();
};