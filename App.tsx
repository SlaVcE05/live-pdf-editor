
import React, { useState, useEffect, useCallback } from 'react';
import { EditableElement, PageInfo, ToolType, TextElement, SignatureElement, SymbolElement } from './types';
import { loadPdfPages, savePdf } from './services/pdfHelper';
import { convertDocxToPdfBytes } from './services/docHelper';
import FileUploader from './components/FileUploader';
import Editor from './components/Editor';
import { nanoid } from 'nanoid';

const measureTextWidth = (text: string, fontSize: number, font = 'Helvetica', isBold = false, isItalic = false) => {
    // This function is duplicated in CanvasView.tsx. For a real app, it would be in a shared utils file.
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
        const fontStyle = isItalic ? 'italic' : 'normal';
        const fontWeight = isBold ? 'bold' : 'normal';
        context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${font}`;
        return context.measureText(text).width;
    }
    // Fallback for environments where canvas is not available.
    const boldMultiplier = isBold ? 1.15 : 1;
    return text.length * fontSize * 0.6 * boldMultiplier;
};

const App: React.FC = () => {
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [pdfOriginalBytes, setPdfOriginalBytes] = useState<Uint8Array | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [elements, setElements] = useState<EditableElement[]>([]);
    const [currentTool, setCurrentTool] = useState<ToolType>('select');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [draggingElement, setDraggingElement] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [resizingElement, setResizingElement] = useState<{ id: string; corner: string; initialX: number; initialY: number; initialWidth: number; initialHeight: number; elementX: number; elementY: number; } | null>(null);


    const handleFileChange = (file: File) => {
        resetState();
        setIsLoading(true);
        setDocumentFile(file);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result) {
                const bytes = e.target.result as ArrayBuffer;
                const fileName = file.name.toLowerCase();
                const fileType = file.type;
                
                try {
                    let loadedPages: PageInfo[] = [];
                    let pdfBytesForEditing: ArrayBuffer;

                    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                        pdfBytesForEditing = bytes;
                    } else if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        const convertedPdfBytes = await convertDocxToPdfBytes(bytes);
                        pdfBytesForEditing = convertedPdfBytes.buffer;
                    } else {
                         throw new Error(`Unsupported file type: ${fileType} for file ${fileName}`);
                    }

                    setPdfOriginalBytes(new Uint8Array(pdfBytesForEditing));
                    const bufferForRendering = pdfBytesForEditing.slice(0);
                    loadedPages = await loadPdfPages(bufferForRendering);

                    if (loadedPages.length === 0) {
                        alert("The selected document has no pages or could not be processed.");
                        resetState();
                        return;
                    }
                    setPages(loadedPages);
                } catch (error) {
                    console.error("Failed to load document:", error);
                    alert("Error: Could not load the file. It might be corrupted or in an unsupported format.");
                    resetState();
                } finally {
                    setIsLoading(false);
                }
            } else {
                alert("Could not read the selected file.");
                resetState();
            }
        };
        reader.onerror = () => {
            alert("An error occurred while reading the file.");
            resetState();
        };
        reader.readAsArrayBuffer(file);
    };

    const resetState = () => {
        setDocumentFile(null);
        setPdfOriginalBytes(null);
        setPages([]);
        setElements([]);
        setCurrentPageIndex(0);
        setSelectedElementId(null);
        setSignatureImage(null);
        setIsLoading(false);
    };

    const handleElementUpdate = (id: string, updates: Partial<EditableElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } as EditableElement : el));
    };

    const addElement = (x: number, y: number) => {
        let newElement: EditableElement | null = null;
        if (currentTool === 'text') {
            const defaultText = 'New Text';
            const fontSize = 16;
            const fontFamily = 'Helvetica';
            const isBold = false;
            const isItalic = false;
            const initialWidth = measureTextWidth(defaultText, fontSize, fontFamily, isBold, isItalic) + 20;

            const textElement: TextElement = {
                id: nanoid(),
                type: 'text',
                x,
                y,
                width: initialWidth,
                height: 24,
                text: defaultText,
                fontSize: fontSize,
                fontFamily: fontFamily,
                isBold: isBold,
                isItalic: isItalic,
                pageIndex: currentPageIndex
            };
            newElement = textElement;
        } else if (currentTool === 'symbol') {
            const symbolElement: SymbolElement = {
                id: nanoid(),
                type: 'symbol',
                x, y,
                width: 24,
                height: 24,
                symbolType: 'checkmark',
                color: '#000000',
                pageIndex: currentPageIndex,
            };
            newElement = symbolElement;
        } else if (currentTool === 'signature' && signatureImage) {
            const signatureElement: SignatureElement = {
                id: nanoid(),
                type: 'signature',
                x,
                y,
                width: 150,
                height: 75,
                imageData: signatureImage,
                pageIndex: currentPageIndex
            };
            newElement = signatureElement;
        }

        if (newElement) {
            setElements(prev => [...prev, newElement]);
            setSelectedElementId(newElement.id);
            setCurrentTool('select');
        }
    };
    
    const deleteSelectedElement = useCallback(() => {
        if (selectedElementId) {
            setElements(prev => prev.filter(el => el.id !== selectedElementId));
            setSelectedElementId(null);
        }
    }, [selectedElementId]);

    const handleExport = async () => {
        if (pages.length === 0 || !pdfOriginalBytes) return;
        setIsLoading(true);
        try {
            const pdfBytes = await savePdf(pdfOriginalBytes, elements, pages);
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `edited_${documentFile?.name.replace(/\.\w+$/, '.pdf') || 'document.pdf'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            alert("An error occurred while exporting the PDF.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const onMouseDownOnElement = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
        e.stopPropagation();
        setSelectedElementId(id);
        const element = elements.find(el => el.id === id);
        if (element && currentTool === 'select') {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            setDraggingElement({
                id,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
            });
        }
    };

    const handleResizeStart = (e: React.MouseEvent, id: string, corner: string) => {
        e.stopPropagation();
        const element = elements.find(el => el.id === id);
        if (!element) return;
        
        setResizingElement({
            id,
            corner,
            initialX: e.clientX,
            initialY: e.clientY,
            initialWidth: element.width,
            initialHeight: element.height,
            elementX: element.x,
            elementY: element.y
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggingElement) {
            const canvasView = document.getElementById('canvas-view');
            if (!canvasView) return;
            const parentRect = canvasView.getBoundingClientRect();
            
            const newX = e.clientX - parentRect.left - draggingElement.offsetX;
            const newY = e.clientY - parentRect.top - draggingElement.offsetY;

            handleElementUpdate(draggingElement.id, { x: newX, y: newY });
            return; // Prevent resizing while dragging
        }

        if (resizingElement) {
            const dx = e.clientX - resizingElement.initialX;

            let newWidth;
            let newX = resizingElement.elementX;

            if (resizingElement.corner.includes('right')) {
                newWidth = resizingElement.initialWidth + dx;
            } else { // left
                newWidth = resizingElement.initialWidth - dx;
                newX = resizingElement.elementX + dx;
            }

            const aspectRatio = resizingElement.initialWidth / resizingElement.initialHeight;
            const newHeight = newWidth / aspectRatio;

            let newY = resizingElement.elementY;
            if (resizingElement.corner.includes('top')) {
                newY = resizingElement.elementY + (resizingElement.initialHeight - newHeight);
            }
            
            handleElementUpdate(resizingElement.id, {
                width: Math.max(20, newWidth),
                height: Math.max(20, newHeight),
                x: newX,
                y: newY,
            });
        }
    }, [draggingElement, resizingElement, handleElementUpdate]);

    const handleMouseUp = useCallback(() => {
        setDraggingElement(null);
        setResizingElement(null);
    }, []);

    useEffect(() => {
        const hasInteraction = draggingElement || resizingElement;
        if (hasInteraction) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingElement, resizingElement, handleMouseMove, handleMouseUp]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not trigger if an input or textarea is focused.
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                return;
            }

            if (selectedElementId && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault(); // Prevent browser back navigation on backspace
                deleteSelectedElement();
            } else {
                switch (e.key.toLowerCase()) {
                    case 't':
                    case 'т':
                        setCurrentTool('text');
                        break;
                    case 's':
                    case 'с':
                        setCurrentTool('signature');
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElementId, deleteSelectedElement]);

    if (!documentFile) {
        return <FileUploader onFileSelect={handleFileChange} isLoading={isLoading} />;
    }

    if (isLoading || pages.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                     <p className="text-gray-600">Processing your document...</p>
                </div>
            </div>
        );
    }

    return (
        <Editor
            pages={pages}
            elements={elements}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            currentTool={currentTool}
            setCurrentTool={setCurrentTool}
            selectedElementId={selectedElementId}
            setSelectedElementId={setSelectedElementId}
            handleElementUpdate={handleElementUpdate}
            addElement={addElement}
            onMouseDownOnElement={onMouseDownOnElement}
            signatureImage={signatureImage}
            setSignatureImage={setSignatureImage}
            deleteSelectedElement={deleteSelectedElement}
            handleExport={handleExport}
            isLoading={isLoading}
            resetApp={resetState}
            handleResizeStart={handleResizeStart}
        />
    );
};

export default App;
