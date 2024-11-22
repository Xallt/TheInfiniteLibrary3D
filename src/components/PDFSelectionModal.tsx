import React, { useState } from 'react';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';

interface PDFSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPDFSourcesSubmitted: (sources: PDFResource[]) => void;
    initialURLs?: string[];
}

type TabType = 'url' | 'file';

export function PDFSelectionModal({
    isOpen,
    onClose,
    onPDFSourcesSubmitted,
    initialURLs = ['https://arxiv.org/pdf/1706.03762']
}: PDFSelectionModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('url');
    const [pdfResources, setPdfResources] = useState<PDFResource[]>(() => 
        initialURLs.map(url => new URLPDFResource(url))
    );

    if (!isOpen) return null;

    const urlResources = pdfResources.filter(resource => resource instanceof URLPDFResource);
    const fileResources = pdfResources.filter(resource => !(resource instanceof URLPDFResource));

    const handleAddUrl = () => {
        setPdfResources([...pdfResources, new URLPDFResource('')]);
    };

    const handleRemoveResource = (index: number) => {
        setPdfResources(pdfResources.filter((_, i) => i !== index));
    };

    const handleUrlChange = (index: number, value: string) => {
        const newResources = [...pdfResources];
        const globalIndex = pdfResources.findIndex((r, i) => r instanceof URLPDFResource && 
            urlResources.indexOf(r) === index);
        if (globalIndex !== -1) {
            newResources[globalIndex] = new URLPDFResource(value);
            setPdfResources(newResources);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newResources = Array.from(files)
            .filter(file => file.type.includes('pdf'))
            .map(file => createPDFResource(file));

        setPdfResources([...pdfResources, ...newResources]);
    };

    const handleSubmit = () => {
        const activeResources = activeTab === 'url' ? urlResources : fileResources;
        
        const validResources = activeResources.filter(resource => {
            if (resource instanceof URLPDFResource) {
                return resource.getDisplayName().trim() !== '';
            }
            return true;
        });

        if (validResources.length > 0) {
            onPDFSourcesSubmitted(validResources);
            const remainingResources = activeTab === 'url' ? 
                fileResources : 
                (activeTab === 'file' ? urlResources : []);
            setPdfResources([
                ...remainingResources,
                ...(activeTab === 'url' ? initialURLs.map(url => new URLPDFResource(url)) : [])
            ]);
            onClose();
        }
    };

    const getSubmitButtonText = () => {
        const activeResources = activeTab === 'url' ? urlResources : fileResources;
        const count = activeResources.length;
        return `Load ${count} PDF${count !== 1 ? 's' : ''}`;
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Add PDFs</h2>
                    <button 
                        className="modal-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === 'url' ? 'active' : ''}`}
                        onClick={() => setActiveTab('url')}
                    >
                        URLs ({urlResources.length})
                    </button>
                    <button 
                        className={`tab ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => setActiveTab('file')}
                    >
                        File Upload ({fileResources.length})
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'url' ? (
                        <div className="url-tab">
                            <div className="url-list">
                                {urlResources.map((resource, index) => (
                                    <div key={index} className="url-input-row">
                                        <input
                                            type="text"
                                            className="url-input"
                                            value={resource.getDisplayName()}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder="Enter PDF URL"
                                        />
                                        {urlResources.length > 1 && (
                                            <button
                                                className="remove-url"
                                                onClick={() => handleRemoveResource(index)}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button className="add-url" onClick={handleAddUrl}>
                                Add Another URL
                            </button>
                        </div>
                    ) : (
                        <div className="file-tab">
                            <div className="file-upload-area">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="file-input"
                                    id="pdf-file-input"
                                />
                                <label htmlFor="pdf-file-input" className="file-input-label">
                                    <div className="upload-icon">📄</div>
                                    <div className="upload-text">
                                        Drop PDF files here or click to select
                                    </div>
                                </label>
                            </div>
                            {fileResources.length > 0 && (
                                <div className="file-list">
                                    <h3>Selected Files:</h3>
                                    {fileResources.map((resource, index) => (
                                        <div key={index} className="file-entry">
                                            <span>{resource.getDisplayName()}</span>
                                            <button
                                                className="remove-url"
                                                onClick={() => handleRemoveResource(
                                                    pdfResources.indexOf(resource)
                                                )}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button 
                    className="submit-urls"
                    onClick={handleSubmit}
                    disabled={
                        (activeTab === 'url' ? urlResources : fileResources).length === 0
                    }
                >
                    {getSubmitButtonText()}
                </button>
            </div>
        </div>
    );
} 