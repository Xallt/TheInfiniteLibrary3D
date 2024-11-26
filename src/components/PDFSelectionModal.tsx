import React, { useState } from 'react';
import { PDFResource, URLPDFResource, createPDFResource } from '../types/PDFResource';

interface PDFResourceWithCount {
    resource: PDFResource;
    count: number;
}

interface PDFSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPDFSourcesSubmitted: (sources: PDFResource[]) => void;
    initialURLs?: string[];
    singleBookMode?: boolean;
}

type TabType = 'url' | 'file';

export function PDFSelectionModal({
    isOpen,
    onClose,
    onPDFSourcesSubmitted,
    initialURLs = [''],
    singleBookMode = false
}: PDFSelectionModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('url');
    const [urlResourcesWithCount, setUrlResourcesWithCount] = useState<PDFResourceWithCount[]>(() => 
        initialURLs.map(url => ({
            resource: new URLPDFResource(url),
            count: 1
        }))
    );
    const [fileResourcesWithCount, setFileResourcesWithCount] = useState<PDFResourceWithCount[]>([]);

    if (!isOpen) return null;

    const handleAddUrl = () => {
        if (singleBookMode && urlResourcesWithCount.length > 0) return;
        
        const newResource = {
            resource: new URLPDFResource(''),
            count: 1
        };
        setUrlResourcesWithCount(prevResources => [...prevResources, newResource]);
    };

    const handleRemoveResource = (index: number) => {
        if (activeTab === 'url') {
            setUrlResourcesWithCount(prev => prev.filter((_, i) => i !== index));
        } else {
            setFileResourcesWithCount(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleUrlChange = (index: number, value: string) => {
        setUrlResourcesWithCount(prev => {
            const newResources = [...prev];
            newResources[index] = {
                resource: new URLPDFResource(value),
                count: newResources[index].count
            };
            return newResources;
        });
    };

    const handleCountChange = (index: number, value: number) => {
        if (activeTab === 'url') {
            setUrlResourcesWithCount(prev => {
                const newResources = [...prev];
                newResources[index] = {
                    ...newResources[index],
                    count: value
                };
                return newResources;
            });
        } else {
            setFileResourcesWithCount(prev => {
                const newResources = [...prev];
                newResources[index] = {
                    ...newResources[index],
                    count: value
                };
                return newResources;
            });
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newResources = Array.from(files)
            .filter(file => file.type.includes('pdf'))
            .map(file => ({
                resource: createPDFResource(file),
                count: 1
            }));

        if (singleBookMode) {
            setFileResourcesWithCount([newResources[0]]);
        } else {
            setFileResourcesWithCount(prev => [...prev, ...newResources]);
            
            event.target.value = '';
        }
    };

    const handleSubmit = () => {
        const activeResources = activeTab === 'url' ? urlResourcesWithCount : fileResourcesWithCount;
        
        const validResources = activeResources.filter(({ resource }) => {
            if (resource instanceof URLPDFResource) {
                return resource.getDisplayName().trim() !== '';
            }
            return true;
        });

        if (validResources.length > 0) {
            const expandedResources = validResources.flatMap(({ resource, count }) => 
                Array(Math.max(1, Math.min(100, count || 1))).fill(resource)
            );
            
            onPDFSourcesSubmitted(expandedResources);
            
            if (activeTab === 'url') {
                setUrlResourcesWithCount(
                    singleBookMode ? [] : initialURLs.map(url => ({
                        resource: new URLPDFResource(url),
                        count: 1
                    }))
                );
            } else {
                setFileResourcesWithCount([]);
            }
            
            onClose();
        }
    };

    const getSubmitButtonText = () => {
        const activeResources = activeTab === 'url' ? urlResourcesWithCount : fileResourcesWithCount;
        const totalCount = activeResources.reduce((sum, { count }) => 
            sum + (count || 1), 0);
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
                onChange={(e) => handleCountChange(index, parseInt(e.target.value))}
                onBlur={(e) => {
                    const num = parseInt(e.target.value);
                    if (isNaN(num) || num < 1) {
                        handleCountChange(index, 1);
                    } else if (num > 100) {
                        handleCountChange(index, 100);
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
                    <h2>{singleBookMode ? 'Select PDF' : 'Add PDFs'}</h2>
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
                        URLs {!singleBookMode && `(${urlResourcesWithCount.length})`}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => setActiveTab('file')}
                    >
                        File Upload {!singleBookMode && `(${fileResourcesWithCount.length})`}
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'url' ? (
                        <div className="url-tab">
                            <div className="url-list">
                                {urlResourcesWithCount.map((resourceWithCount, index) => (
                                    <div key={index} className="url-input-row">
                                        <input
                                            type="text"
                                            className="url-input"
                                            value={resourceWithCount.resource.getDisplayName()}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder="Enter PDF URL"
                                        />
                                        {!singleBookMode && renderCountSelector(resourceWithCount, index)}
                                        {!singleBookMode && urlResourcesWithCount.length > 1 && (
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
                            {(!singleBookMode || urlResourcesWithCount.length === 0) && (
                                <button className="add-url" onClick={handleAddUrl}>
                                    Add {singleBookMode ? 'URL' : 'Another URL'}
                                </button>
                            )}
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
                            {fileResourcesWithCount.length > 0 && (
                                <div className="file-list">
                                    <h3>Selected Files:</h3>
                                    {fileResourcesWithCount.map((resourceWithCount, index) => (
                                        <div key={index} className="file-entry">
                                            <span>{resourceWithCount.resource.getDisplayName()}</span>
                                            {!singleBookMode && renderCountSelector(resourceWithCount, index)}
                                            <button
                                                className="remove-url"
                                                onClick={() => handleRemoveResource(index)}
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
                    disabled={(activeTab === 'url' ? urlResourcesWithCount : fileResourcesWithCount).length === 0}
                >
                    {singleBookMode ? 'Select PDF' : getSubmitButtonText()}
                </button>
            </div>
        </div>
    );
} 