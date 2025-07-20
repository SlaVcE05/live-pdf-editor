import { PageInfo } from '../types';

declare const mammoth: any;
declare const html2canvas: any;

// Define a standard page size for rendering DOCX content.
// A4 aspect ratio is approx 1/1.414, but we'll use dimensions common for web rendering.
const RENDER_WIDTH = 794; // Corresponds to A4 width at 96 DPI for consistency.
const RENDER_HEIGHT = 1123; // Corresponds to A4 height at 96 DPI.

export const loadDocxPages = async (docxBytes: ArrayBuffer): Promise<PageInfo[]> => {
    // 1. Convert the DOCX ArrayBuffer to an HTML string.
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: docxBytes });

    // 2. Create a hidden, off-screen container to render the HTML.
    // This allows us to measure and paginate the content without affecting the user's view.
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-9999px'; // Position it far off-screen.
    renderContainer.style.top = '-9999px';
    renderContainer.style.width = `${RENDER_WIDTH}px`;
    renderContainer.style.background = 'white';
    renderContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';

    // Inject some basic styles to ensure content wraps correctly and images are constrained.
    renderContainer.innerHTML = `
        <style>
            p, h1, h2, h3, h4, h5, h6, li, blockquote, td { 
                max-width: 100%; 
                word-wrap: break-word; 
                line-height: 1.4;
            }
            img, svg { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ccc; padding: 8px; }
        </style>
        ${html}
    `;
    
    document.body.appendChild(renderContainer);
    
    // Wait for all images in the converted HTML to load before proceeding.
    // This is crucial for getting an accurate measurement of the content height
    // and for ensuring images are present in the final canvas render.
    const images = Array.from(renderContainer.getElementsByTagName('img'));
    const imageLoadPromises = images.map(img => {
        if (img.complete) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // Resolve even on error to prevent the process from hanging.
        });
    });

    await Promise.all(imageLoadPromises);
    
    // Give the browser a frame to compute the layout with the loaded images.
    await new Promise(resolve => requestAnimationFrame(resolve));

    const pagesInfo: PageInfo[] = [];
    const totalContentHeight = renderContainer.scrollHeight;
    const pageCount = Math.ceil(totalContentHeight / RENDER_HEIGHT) || 1;

    // 3. Use html2canvas to "screenshot" the rendered HTML, one page at a time.
    for (let i = 0; i < pageCount; i++) {
        const canvas = await html2canvas(renderContainer, {
            width: RENDER_WIDTH,
            height: RENDER_HEIGHT,
            y: i * RENDER_HEIGHT, // This option captures a specific vertical slice of the container.
            scale: 1.5, // Render at a higher scale for better image quality.
            backgroundColor: '#ffffff',
            logging: false,
        });
        pagesInfo.push({
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
        });
    }

    // 4. Clean up by removing the hidden container from the DOM.
    document.body.removeChild(renderContainer);

    return pagesInfo;
};
