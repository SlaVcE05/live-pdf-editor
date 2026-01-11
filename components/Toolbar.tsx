
import React, { useRef } from 'react';
import { EditableElement, TextElement, ToolType } from '../types';
import { PointerIcon, TextIcon, SignatureIcon, TrashIcon, UploadIcon, DownloadIcon, BoldIcon, ItalicIcon, CheckIcon } from './icons';
import { AppInfo } from '../AppInfo'

interface ToolbarProps {
    currentTool: ToolType;
    setCurrentTool: (tool: ToolType) => void;
    selectedElementId: string | null;
    elements: EditableElement[];
    handleElementUpdate: (id: string, updates: Partial<EditableElement>) => void;
    signatureImage: string | null;
    setSignatureImage: (image: string | null) => void;
    deleteSelectedElement: () => void;
    handleExport: () => void;
    isLoading: boolean;
    resetApp: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const Toolbar: React.FC<ToolbarProps> = (props) => {
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const selectedElement = props.elements.find(el => el.id === props.selectedElementId);

    const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                props.setSignatureImage(reader.result as string);
                props.setCurrentTool('signature');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid PNG or JPG image.');
        }
    };

    const handleSignatureAction = () => {
        if (props.signatureImage) {
            props.setCurrentTool('signature');
        } else {
            signatureInputRef.current?.click();
        }
    };

    const ToolButton = ({ tool, icon, children, title }: { tool: ToolType; icon: React.ReactNode; children: React.ReactNode, title?: string }) => (
        <button
            onClick={() => props.setCurrentTool(tool)}
            title={title}
            className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${props.currentTool === tool ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
        >
            {icon}
            <span className="truncate">{children}</span>
        </button>
    );

    return (
        <aside 
            className={`bg-white h-full flex flex-col shadow-xl transition-all duration-300 ease-in-out border-r border-gray-200 z-50 ${props.isOpen ? 'w-72' : 'w-0 overflow-hidden opacity-0'}`}
            aria-hidden={!props.isOpen}
        >
            <div className="p-4 flex flex-col h-full min-w-[288px]">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Editor V{AppInfo.version}</h1>
                    <button 
                        onClick={() => props.setIsOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                        title="Collapse Sidebar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">Tools</h2>
                    {/* Fixed missing children props for ToolButton components */}
                    <ToolButton tool="select" icon={<PointerIcon className="w-5 h-5" />}>Select</ToolButton>
                    <ToolButton tool="text" icon={<TextIcon className="w-5 h-5" />} title="Shortcut: T">Add Text</ToolButton>
                    <ToolButton tool="symbol" icon={<CheckIcon className="w-5 h-5" />}>Add Checkmark</ToolButton>
                    
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleSignatureAction}
                            title="Shortcut: S"
                            className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${props.currentTool === 'signature' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                        >
                            {props.signatureImage ? <SignatureIcon className="w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
                            <span className="truncate">{props.signatureImage ? 'Place Signature' : 'Upload Signature'}</span>
                        </button>
                        <input type="file" accept="image/png, image/jpeg" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" />
                        {props.signatureImage && (
                            <div 
                                className="p-2 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => props.setCurrentTool('signature')}
                                title="Click to place signature"
                            >
                                <img src={props.signatureImage} alt="Signature preview" className="max-w-full h-auto rounded"/>
                            </div>
                        )}
                    </div>

                    {selectedElement && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 px-1">Element Properties</h2>
                            {selectedElement.type === 'text' && (
                                <div className="flex flex-col gap-4 px-1">
                                    <div>
                                        <label htmlFor="fontFamily" className="text-xs font-medium text-gray-500 mb-1 block">Font Family</label>
                                        <select
                                            id="fontFamily"
                                            value={(selectedElement as TextElement).fontFamily}
                                            onChange={(e) => props.handleElementUpdate(selectedElement.id, { fontFamily: e.target.value })}
                                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Arial">Arial</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier">Courier</option>
                                            <option value="Verdana">Verdana</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Style</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="fontSize"
                                                type="number"
                                                value={(selectedElement as TextElement).fontSize}
                                                onChange={(e) => props.handleElementUpdate(selectedElement.id, { fontSize: parseInt(e.target.value, 10) || 1 })}
                                                className="w-16 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                aria-label="Font Size"
                                            />
                                            <button
                                                onClick={() => props.handleElementUpdate(selectedElement.id, { isBold: !(selectedElement as TextElement).isBold })}
                                                className={`p-2 rounded-md border transition-colors ${(selectedElement as TextElement).isBold ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}
                                                title="Bold"
                                                aria-pressed={(selectedElement as TextElement).isBold}
                                            >
                                                <BoldIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => props.handleElementUpdate(selectedElement.id, { isItalic: !(selectedElement as TextElement).isItalic })}
                                                className={`p-2 rounded-md border transition-colors ${(selectedElement as TextElement).isItalic ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}
                                                title="Italic"
                                                aria-pressed={(selectedElement as TextElement).isItalic}
                                            >
                                                <ItalicIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button onClick={props.deleteSelectedElement} className="w-full mt-4 flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200">
                                <TrashIcon className="w-4 h-4" />
                                Delete Element
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100 mt-auto">
                    <button onClick={props.handleExport} disabled={props.isLoading} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 font-semibold shadow-sm">
                        {props.isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <DownloadIcon className="w-5 h-5" />}
                        {props.isLoading ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button onClick={props.resetApp} className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        Load New File
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Toolbar;
