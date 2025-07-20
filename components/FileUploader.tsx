
import React, { useRef } from 'react';
import { UploadCloudIcon } from './icons';

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "application/pdf") {
            onFileSelect(file);
        } else {
            alert("Please select a valid PDF file.");
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file && file.type === "application/pdf") {
            onFileSelect(file);
        } else {
            alert("Please select a valid PDF file.");
        }
    };
    
    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800">Live Document Editor</h1>
                <p className="text-gray-500">Upload a PDF to start editing. Add text, signatures, and more.</p>
                
                <div 
                    className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4">
                             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                             <p className="text-gray-600">Loading your document...</p>
                        </div>
                    ) : (
                        <>
                            <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-lg font-semibold text-gray-700">Drag & drop your PDF here</p>
                            <p className="text-gray-500">or click to browse files</p>
                            <input
                                type="file"
                                ref={inputRef}
                                onChange={handleFileChange}
                                accept="application/pdf"
                                className="hidden"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUploader;