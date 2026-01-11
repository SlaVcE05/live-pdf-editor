
import React, { useEffect, useRef, useState } from 'react';
import { EditableElement, PageInfo, TextElement, ToolType, SymbolElement } from '../types';
import { CheckIcon } from './icons';

const measureTextWidth = (text: string, fontSize: number, font = 'Helvetica', isBold = false, isItalic = false) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
        const fontStyle = isItalic ? 'italic' : 'normal';
        const fontWeight = isBold ? 'bold' : 'normal';
        context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${font}`;
        return context.measureText(text).width;
    }
    const boldMultiplier = isBold ? 1.15 : 1;
    return text.length * fontSize * 0.6 * boldMultiplier;
};

interface CanvasViewProps {
    page: PageInfo;
    elements: EditableElement[];
    addElement: (x: number, y: number) => void;
    setSelectedElementId: (id: string | null) => void;
    onMouseDownOnElement: (e: React.MouseEvent<HTMLDivElement | HTMLImageElement>, id: string) => void;
    selectedElementId: string | null;
    handleElementUpdate: (id: string, updates: Partial<EditableElement>) => void;
    currentTool: ToolType;
    handleResizeStart: (e: React.MouseEvent, id: string, corner: string) => void;
}

const ResizeHandle: React.FC<{
    position: string;
    onMouseDown: (e: React.MouseEvent) => void;
}> = ({ position, onMouseDown }) => {
    const positions: { [key: string]: string } = {
        'top-left': 'top-[-6px] left-[-6px] cursor-nwse-resize',
        'top-right': 'top-[-6px] right-[-6px] cursor-nesw-resize',
        'bottom-left': 'bottom-[-6px] left-[-6px] cursor-nesw-resize',
        'bottom-right': 'bottom-[-6px] right-[-6px] cursor-nwse-resize',
    };
    return (
        <div
            onMouseDown={onMouseDown}
            className={`absolute w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md z-20 ${positions[position]}`}
        />
    );
};

const CanvasView: React.FC<CanvasViewProps> = ({ page, elements, addElement, setSelectedElementId, onMouseDownOnElement, selectedElementId, handleElementUpdate, currentTool, handleResizeStart }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const focusedElementRef = useRef<HTMLTextAreaElement | null>(null);
    const textElementRefs = useRef<{[id: string]: HTMLTextAreaElement | null}>({});
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                // Get the actual width of the container allocated for the editor
                const parent = containerRef.current.parentElement;
                if (!parent) return;
                
                const availableWidth = parent.clientWidth;
                // Leave a small gutter of 8px on each side (16px total)
                const targetWidth = availableWidth - 16;
                
                // Ensure scale is at most 1, and fits availableWidth
                const newScale = Math.min(1, targetWidth / page.width);
                setScale(newScale);
            }
        };

        // Create a ResizeObserver to respond to container size changes (e.g. sidebar collapse)
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current?.parentElement) {
            observer.observe(containerRef.current.parentElement);
        }

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => {
            window.removeEventListener('resize', updateScale);
            observer.disconnect();
        };
    }, [page.width]);

    useEffect(() => {
        if (selectedElementId && focusedElementRef.current) {
            focusedElementRef.current.focus();
            if (focusedElementRef.current.value === 'New Text') {
                focusedElementRef.current.select();
            }
        }
    }, [selectedElementId]);
    
    useEffect(() => {
        elements.forEach(element => {
            if (element.type === 'text') {
                const textarea = textElementRefs.current[element.id];
                if (textarea) {
                    textarea.style.height = 'auto';
                    const scrollHeight = textarea.scrollHeight;
                    textarea.style.height = '100%';
                    const minHeight = element.fontSize * 1.2;
                    const newHeight = Math.max(scrollHeight, minHeight);
                    if (Math.abs(element.height - newHeight) > 1) {
                        handleElementUpdate(element.id, { height: newHeight });
                    }
                }
            }
        });
    }, [elements, handleElementUpdate]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;

        if (['text', 'signature', 'symbol'].includes(currentTool)) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            addElement(x, y);
        } else {
            setSelectedElementId(null);
        }
    };
    
    const handleTextChange = (element: TextElement, newText: string) => {
        const lines = newText.split('\n');
        const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
        const newWidth = measureTextWidth(longestLine || ' ', element.fontSize, element.fontFamily, element.isBold, element.isItalic) + 20;
        handleElementUpdate(element.id, { text: newText, width: newWidth });
    };

    return (
        <div 
          ref={containerRef}
          className="flex justify-center w-full max-w-full overflow-hidden px-2"
        >
            <div 
              id="canvas-view"
              className="relative shadow-2xl bg-white origin-top-left transition-transform duration-200" 
              style={{ 
                width: page.width, 
                height: page.height, 
                transform: `scale(${scale})`,
                cursor: ['text', 'signature', 'symbol'].includes(currentTool) ? 'crosshair' : 'default',
                marginBottom: `${(page.height * scale) - page.height}px`,
                marginRight: `${(page.width * scale) - page.width}px`
              }}
              onClick={handleCanvasClick}
            >
                <img src={page.dataUrl} alt="PDF Page" className="w-full h-full select-none pointer-events-none" />
                
                {elements.map(element => (
                    <div
                        key={element.id}
                        onMouseDown={(e) => {
                            onMouseDownOnElement(e, element.id);
                        }}
                        style={{
                            position: 'absolute',
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            border: selectedElementId === element.id ? '2px solid #3b82f6' : '1px dashed transparent',
                            cursor: currentTool === 'select' ? 'move' : 'default',
                            userSelect: 'none',
                        }}
                    >
                        {element.type === 'text' ? (
                            <textarea
                                 ref={el => {
                                    textElementRefs.current[element.id] = el;
                                    if (selectedElementId === element.id) focusedElementRef.current = el;
                                }}
                                value={(element as TextElement).text}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    if (currentTool === 'select') setSelectedElementId(element.id);
                                }}
                                onChange={(e) => handleTextChange(element as TextElement, e.target.value)}
                                style={{ 
                                    fontSize: `${(element as TextElement).fontSize}px`,
                                    color: 'black',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    width: '100%',
                                    height: '100%',
                                    fontFamily: (element as TextElement).fontFamily,
                                    fontWeight: (element as TextElement).isBold ? 'bold' : 'normal',
                                    fontStyle: (element as TextElement).isItalic ? 'italic' : 'normal',
                                    lineHeight: 1.2,
                                    cursor: 'text',
                                    userSelect: 'text',
                                    overflowY: 'hidden',
                                }}
                            />
                        ) : element.type === 'signature' ? (
                            <img 
                              src={element.imageData} 
                              alt="signature" 
                              className="w-full h-full"
                              onMouseDown={(e) => onMouseDownOnElement(e, element.id)}
                            />
                        ) : (
                            <CheckIcon 
                                className="w-full h-full"
                                style={{ color: (element as SymbolElement).color }}
                            />
                        )}
                        {(element.type === 'signature' || element.type === 'symbol') && selectedElementId === element.id && (
                            <>
                                <ResizeHandle position="top-left" onMouseDown={(e) => handleResizeStart(e, element.id, 'top-left')} />
                                <ResizeHandle position="top-right" onMouseDown={(e) => handleResizeStart(e, element.id, 'top-right')} />
                                <ResizeHandle position="bottom-left" onMouseDown={(e) => handleResizeStart(e, element.id, 'bottom-left')} />
                                <ResizeHandle position="bottom-right" onMouseDown={(e) => handleResizeStart(e, element.id, 'bottom-right')} />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CanvasView;
