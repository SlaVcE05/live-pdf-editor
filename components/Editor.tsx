import React from 'react';
import { EditableElement, PageInfo, ToolType } from '../types';
import Toolbar from './Toolbar';
import CanvasView from './CanvasView';

interface EditorProps {
    pages: PageInfo[];
    elements: EditableElement[];
    currentPageIndex: number;
    setCurrentPageIndex: (index: number) => void;
    currentTool: ToolType;
    setCurrentTool: (tool: ToolType) => void;
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    handleElementUpdate: (id: string, updates: Partial<EditableElement>) => void;
    addElement: (x: number, y: number) => void;
    onMouseDownOnElement: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    signatureImage: string | null;
    setSignatureImage: (image: string | null) => void;
    deleteSelectedElement: () => void;
    handleExport: () => void;
    isLoading: boolean;
    resetApp: () => void;
    handleResizeStart: (e: React.MouseEvent, id: string, corner: string) => void;
}

const Editor: React.FC<EditorProps> = (props) => {
    return (
        <div className="flex h-screen w-screen bg-gray-200 font-sans">
            <Toolbar {...props} />
            <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-auto">
                <CanvasView
                    page={props.pages[props.currentPageIndex]}
                    elements={props.elements.filter(el => el.pageIndex === props.currentPageIndex)}
                    addElement={props.addElement}
                    setSelectedElementId={props.setSelectedElementId}
                    onMouseDownOnElement={props.onMouseDownOnElement}
                    selectedElementId={props.selectedElementId}
                    handleElementUpdate={props.handleElementUpdate}
                    currentTool={props.currentTool}
                    handleResizeStart={props.handleResizeStart}
                />
                 <div className="mt-4 flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-md">
                    <button
                        onClick={() => props.setCurrentPageIndex(Math.max(0, props.currentPageIndex - 1))}
                        disabled={props.currentPageIndex === 0}
                        className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                    >
                        Prev
                    </button>
                    <span>
                        Page {props.currentPageIndex + 1} of {props.pages.length}
                    </span>
                    <button
                        onClick={() => props.setCurrentPageIndex(Math.min(props.pages.length - 1, props.currentPageIndex + 1))}
                        disabled={props.currentPageIndex === props.pages.length - 1}
                        className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Editor;
