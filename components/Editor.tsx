
import React, { useState } from 'react';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

    return (
        <div className="flex h-screen w-screen bg-gray-200 font-sans overflow-hidden relative">
            <Toolbar 
                {...props} 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
            />
            
            <main className="flex-1 flex flex-col items-center justify-start p-1 sm:p-4 overflow-x-hidden overflow-y-auto relative transition-all duration-300">
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="fixed left-4 top-4 z-50 p-3 bg-white rounded-xl shadow-xl border border-gray-200 hover:bg-gray-50 hover:scale-105 transition-all text-blue-600"
                        title="Open Toolbar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                    </button>
                )}
                
                <div className="w-full flex justify-center py-2 sm:py-4">
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
                </div>
                
                <div className="sticky bottom-6 mt-auto mb-4 flex items-center gap-2 sm:gap-4 bg-white/90 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-2xl border border-white/20 shrink-0 z-40">
                    <button
                        onClick={() => props.setCurrentPageIndex(Math.max(0, props.currentPageIndex - 1))}
                        disabled={props.currentPageIndex === 0}
                        className="p-2 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <span className="text-xs sm:text-sm font-bold text-gray-800 min-w-[80px] sm:min-w-[100px] text-center">
                        {props.currentPageIndex + 1} / {props.pages.length}
                    </span>
                    <button
                        onClick={() => props.setCurrentPageIndex(Math.min(props.pages.length - 1, props.currentPageIndex + 1))}
                        disabled={props.currentPageIndex === props.pages.length - 1}
                        className="p-2 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Editor;
