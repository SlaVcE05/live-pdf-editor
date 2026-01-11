
import React, { useRef } from 'react';
import { UploadCloudIcon } from './icons';
import { AppInfo } from "../AppInfo";

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleFileValidation = (file: File | undefined) => {
        if (!file) return;

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.doc')) {
            alert("Legacy .doc files are not supported. Please convert the file to .docx and try again.");
            if (inputRef.current) inputRef.current.value = ""; // Reset file input
            return;
        }

        const isDocx = fileName.endsWith('.docx') || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const isPdf = fileName.endsWith('.pdf') || file.type === "application/pdf";

        if (isDocx || isPdf) {
            onFileSelect(file);
        } else {
            alert("Please select a valid PDF or Word (.docx) file.");
            if (inputRef.current) inputRef.current.value = ""; // Reset file input
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFileValidation(event.target.files?.[0]);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        handleFileValidation(event.dataTransfer.files?.[0]);
    };
    
    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <amp-ad width="100vw" height="320"
     type="adsense"
     data-ad-client="ca-pub-7044114851093096"
     data-ad-slot="9345744575"
     data-auto-format="rspv"
     data-full-width="">
  <div overflow=""></div>
</amp-ad>
            <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800">Live Document Editor</h1>
                <p className="text-gray-500">Upload a PDF or Word (.docx) document to start editing.</p>
                <p className="text-gray-500">V{AppInfo.version}</p>
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
                            <p className="text-lg font-semibold text-gray-700">Drag & drop your file here</p>
                            <p className="text-gray-500">or click to browse files</p>
                            <input
                                type="file"
                                ref={inputRef}
                                onChange={handleFileChange}
                                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                                className="hidden"
                            />
                        </>
                    )}
                </div>
                 <p className="text-xs text-gray-400">Supported formats: PDF, DOCX</p>
            </div>
        </div>
    );
};

export default FileUploader;
