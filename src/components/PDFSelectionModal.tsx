import React, { useState } from 'react';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';

interface PDFResourceWithCount {
    resource: PDFResource;
    count: string;
}

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
    const [resourcesWithCount, setResourcesWithCount] = useState<PDFResourceWithCount[]>(() => 
        initialURLs.map(url => ({
            resource: new URLPDFResource(url),
            count: '1'
        }))
    );

    if (!isOpen) return null;

    const urlResources = resourcesWithCount.filter(r => r.resource instanceof URLPDFResource);
    const fileResources = resourcesWithCount.filter(r => !(r.resource instanceof URLPDFResource));

    const handleAddUrl = () => {
        setResourcesWithCount([...resourcesWithCount, {
            resource: new URLPDFResource(''),
            count: '1'
        }]);
    };

    const handleRemoveResource = (index: number) => {
        setResourcesWithCount(resourcesWithCount.filter((_, i) => i !== index));
    };

    const handleUrlChange = (index: number, value: string) => {
        const newResources = [...resourcesWithCount];
        const globalIndex = resourcesWithCount.findIndex((r, i) => 
            r.resource instanceof URLPDFResource && 
            urlResources.indexOf(r) === index
        );
        if (globalIndex !== -1) {
            newResources[globalIndex] = {
                resource: new URLPDFResource(value),
                count: newResources[globalIndex].count
            };
            setResourcesWithCount(newResources);
        }
    };

    const handleCountChange = (index: number, value: string) => {
        const newResources = [...resourcesWithCount];
        newResources[index] = {
            ...newResources[index],
            count: value
        };
        setResourcesWithCount(newResources);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newResources = Array.from(files)
            .filter(file => file.type.includes('pdf'))
            .map(file => ({
                resource: createPDFResource(file),
                count: '1'
            }));

        setResourcesWithCount([...resourcesWithCount, ...newResources]);
    };

    const handleSubmit = () => {
        const activeResourcesWithCount = activeTab === 'url' ? urlResources : fileResources;
        
        const validResourcesWithCount = activeResourcesWithCount.filter(({ resource, count }) => {
            if (resource instanceof URLPDFResource) {
                return resource.getDisplayName().trim() !== '';
            }
            return true;
        });

        if (validResourcesWithCount.length > 0) {
            const expandedResources = validResourcesWithCount.flatMap(({ resource, count }) => 
                Array(Math.max(1, Math.min(100, parseInt(count) || 1))).fill(resource)
            );
            
            onPDFSourcesSubmitted(expandedResources);
            
            const remainingResources = activeTab === 'url' ? 
                fileResources : 
                (activeTab === 'file' ? urlResources : []);
            
            setResourcesWithCount([
                ...remainingResources,
                ...(activeTab === 'url' ? initialURLs.map(url => ({
                    resource: new URLPDFResource(url),
                    count: '1'
                })) : [])
            ]);
            onClose();
        }
    };

    const getSubmitButtonText = () => {
        const activeResourcesWithCount = activeTab === 'url' ? urlResources : fileResources;
        const totalCount = activeResourcesWithCount.reduce((sum, { count }) => 
            sum + (parseInt(count) || 1), 0);
        return `Load ${totalCount} PDF${totalCount !== 1 ? 's' : ''}`;
    };

    const renderCountSelector = (resourceWithCount: PDFResourceWithCount, index: number) => (
        <div className="count-selector">
            <span className="count-label">Copies:</span>
            <input
                type="number"
                min="1"
                max="100"
                value={resourceWithCount.count}
                onChange={(e) => handleCountChange(index, e.target.value)}
                onBlur={(e) => {
                    const num = parseInt(e.target.value);
                    if (isNaN(num) || num < 1) {
                        handleCountChange(index, '1');
                    } else if (num > 100) {
                        handleCountChange(index, '100');
                    }
                }}
                className="count-input"
            />
        </div>
    );

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
                                {urlResources.map(({ resource, count }, index) => (
                                    <div key={index} className="url-input-row">
                                        <input
                                            type="text"
                                            className="url-input"
                                            value={resource.getDisplayName()}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder="Enter PDF URL"
                                        />
                                        {renderCountSelector(urlResources[index], 
                                            resourcesWithCount.indexOf(urlResources[index]))}
                                        {urlResources.length > 1 && (
                                            <button
                                                className="remove-url"
                                                onClick={() => handleRemoveResource(
                                                    resourcesWithCount.indexOf(urlResources[index])
                                                )}
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
                                    {fileResources.map(({ resource, count }, index) => (
                                        <div key={index} className="file-entry">
                                            <span>{resource.getDisplayName()}</span>
                                            {renderCountSelector(fileResources[index],
                                                resourcesWithCount.indexOf(fileResources[index]))}
                                            <button
                                                className="remove-url"
                                                onClick={() => handleRemoveResource(
                                                    resourcesWithCount.indexOf(fileResources[index])
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