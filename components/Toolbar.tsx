
import React, { useRef } from 'react';
import { EditableElement, TextElement, ToolType } from '../types';
import { PointerIcon, TextIcon, SignatureIcon, TrashIcon, UploadIcon, DownloadIcon } from './icons';

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

    const ToolButton = ({ tool, icon, children }: { tool: ToolType; icon: React.ReactNode, children: React.ReactNode }) => (
        <button
            onClick={() => props.setCurrentTool(tool)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${props.currentTool === tool ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
        >
            {icon}
            {children}
        </button>
    );

    return (
        <aside className="w-72 bg-white h-full p-4 flex flex-col shadow-lg">
            <div className="flex items-center gap-2 mb-6">
                 <h1 className="text-xl font-bold text-gray-800">Editor</h1>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Tools</h2>
                <ToolButton tool="select" icon={<PointerIcon className="w-5 h-5" />}>Select</ToolButton>
                <ToolButton tool="text" icon={<TextIcon className="w-5 h-5" />}>Add Text</ToolButton>
                
                <div className="flex flex-col gap-2">
                     <button
                        onClick={() => signatureInputRef.current?.click()}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${props.currentTool === 'signature' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                    >
                        {props.signatureImage ? <SignatureIcon className="w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
                        {props.signatureImage ? 'Place Signature' : 'Upload Signature'}
                    </button>
                    <input type="file" accept="image/png, image/jpeg" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" />
                    {props.signatureImage && (
                        <div className="p-2 border border-gray-200 rounded-lg bg-gray-50">
                            <img src={props.signatureImage} alt="Signature preview" className="max-w-full h-auto rounded"/>
                        </div>
                    )}
                </div>

                {selectedElement && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Element Properties</h2>
                        {selectedElement.type === 'text' && (
                             <div className="flex flex-col gap-2">
                                <label htmlFor="fontSize" className="text-sm text-gray-600">Font Size (px)</label>
                                <input
                                    id="fontSize"
                                    type="number"
                                    value={(selectedElement as TextElement).fontSize}
                                    onChange={(e) => props.handleElementUpdate(selectedElement.id, { fontSize: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                             </div>
                        )}
                        <button onClick={props.deleteSelectedElement} className="w-full mt-4 flex items-center justify-center gap-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                            <TrashIcon className="w-5 h-5" />
                            Delete Element
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-200">
                 <button onClick={props.handleExport} disabled={props.isLoading} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                    {props.isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <DownloadIcon className="w-5 h-5" />}
                    {props.isLoading ? 'Exporting...' : 'Export as PDF'}
                </button>
                <button onClick={props.resetApp} className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Load New PDF
                </button>
            </div>
        </aside>
    );
};

export default Toolbar;