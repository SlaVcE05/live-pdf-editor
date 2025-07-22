
import React, { useEffect, useRef } from 'react';
import { EditableElement, PageInfo, TextElement, ToolType } from '../types';

const measureTextWidth = (text: string, fontSize: number, font = 'Helvetica', isBold = false, isItalic = false) => {
    // This function is duplicated in App.tsx. For a real app, it would be in a shared utils file.
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
        'top-left': 'top-[-5px] left-[-5px] cursor-nwse-resize',
        'top-right': 'top-[-5px] right-[-5px] cursor-nesw-resize',
        'bottom-left': 'bottom-[-5px] left-[-5px] cursor-nesw-resize',
        'bottom-right': 'bottom-[-5px] right-[-5px] cursor-nwse-resize',
    };
    return (
        <div
            onMouseDown={onMouseDown}
            className={`absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-full z-10 ${positions[position]}`}
        />
    );
};

const CanvasView: React.FC<CanvasViewProps> = ({ page, elements, addElement, setSelectedElementId, onMouseDownOnElement, selectedElementId, handleElementUpdate, currentTool, handleResizeStart }) => {
    const focusedElementRef = useRef<HTMLTextAreaElement | null>(null);
    const textElementRefs = useRef<{[id: string]: HTMLTextAreaElement | null}>({});

    useEffect(() => {
        if (focusedElementRef.current && document.activeElement !== focusedElementRef.current) {
            focusedElementRef.current.focus();
            const text = focusedElementRef.current.value;

            // When a new text element is created with the default text, select it all
            // so the user can immediately type to replace it.
            if (text === 'New Text') {
                focusedElementRef.current.select();
            } else {
                const len = text.length;
                focusedElementRef.current.setSelectionRange(len, len);
            }
        }
    }, [selectedElementId]);
    
    useEffect(() => {
        elements.forEach(element => {
            if (element.type === 'text') {
                const textarea = textElementRefs.current[element.id];
                if (textarea) {
                    // Temporarily set height to auto to get the real scrollHeight
                    textarea.style.height = 'auto';
                    const scrollHeight = textarea.scrollHeight;
                    // Set it back to 100% to fill the parent container
                    textarea.style.height = '100%';

                    const minHeight = element.fontSize * 1.2;
                    const newHeight = Math.max(scrollHeight, minHeight);
                    
                    // Only update if the height has meaningfully changed, to avoid render loops
                    if (Math.abs(element.height - newHeight) > 1) {
                        handleElementUpdate(element.id, { height: newHeight });
                    }
                }
            }
        });
    }, [elements, handleElementUpdate]);


    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only handle clicks on the canvas background. Clicks on elements are handled by their own handlers.
        if (e.target !== e.currentTarget) {
            return;
        }

        if (currentTool === 'text' || currentTool === 'signature') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addElement(x, y);
        } else {
            setSelectedElementId(null);
        }
    };
    
    const handleTextChange = (element: TextElement, newText: string) => {
        const lines = newText.split('\n');
        const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
        // Use the width of a space if the line is empty to prevent collapse
        const newWidth = measureTextWidth(longestLine || ' ', element.fontSize, element.fontFamily, element.isBold, element.isItalic) + 20; // Add some padding
        handleElementUpdate(element.id, { text: newText, width: newWidth });
    };

    return (
        <div 
          id="canvas-view"
          className="relative shadow-lg" 
          style={{ width: page.width, height: page.height, cursor: (currentTool === 'text' || currentTool === 'signature') ? 'crosshair' : 'default' }}
          onClick={handleCanvasClick}
        >
            <img src={page.dataUrl} alt="PDF Page" className="w-full h-full select-none pointer-events-none" />
            
            {elements.map(element => (
                <div
                    key={element.id}
                    onMouseDown={(e) => onMouseDownOnElement(e, element.id)}
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
                                if (selectedElementId === element.id) {
                                    focusedElementRef.current = el;
                                }
                            }}
                            value={(element as TextElement).text}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (currentTool === 'select') {
                                    setSelectedElementId(element.id);
                                }
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
                    ) : (
                        <img 
                          src={element.imageData} 
                          alt="signature" 
                          className="w-full h-full"
                          onMouseDown={(e) => onMouseDownOnElement(e, element.id)}
                        />
                    )}
                    {element.type === 'signature' && selectedElementId === element.id && (
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
    );
};

export default CanvasView;
