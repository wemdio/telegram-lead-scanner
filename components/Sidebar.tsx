import React, { useState, useCallback } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UploadIcon } from './icons/UploadIcon';

interface SidebarProps {
  onScan: (leadProfile: string, files: File[]) => void;
  isLoading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onScan, isLoading }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [leadProfile, setLeadProfile] = useState<string>('I am looking for clients who need a freelance frontend developer for a React.js project. They might mention needing a website, an app, or help with an existing project.');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type === "application/json");
      setFiles(droppedFiles);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0 && leadProfile.trim()) {
      onScan(leadProfile.trim(), files);
    }
  };

  return (
    <aside className="w-1/3 max-w-md bg-slate-800/50 p-6 flex flex-col border-r border-slate-700">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Configuration</h2>
      <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Upload Telegram JSON Export
          </label>
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center w-full h-32 px-4 transition bg-slate-900 border-2 ${isDragging ? 'border-cyan-500' : 'border-slate-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-slate-400 focus:outline-none`}
          >
            <div className="flex items-center space-x-2 text-slate-400 text-center">
                <UploadIcon className="w-8 h-8 mx-auto mb-2"/>
                <span className="font-medium">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'Drop JSON files here or click to upload'}
                </span>
            </div>
            <input
                type="file"
                multiple
                accept=".json,application/json"
                onChange={handleFileChange}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
            />
          </div>
          {files.length > 0 && (
              <div className="mt-2 text-xs text-slate-400 max-h-20 overflow-y-auto">
                  <ul className="space-y-1">
                      {files.map(f => <li className="truncate" key={f.name}>- {f.name}</li>)}
                  </ul>
              </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Export chat history from Telegram Desktop in "Machine-readable JSON" format.
          </p>
        </div>

        <div className="mb-6 flex-grow flex flex-col">
          <label htmlFor="leadProfile" className="block text-sm font-medium text-slate-300 mb-2">
            Describe Your Ideal Lead
          </label>
          <textarea
            id="leadProfile"
            value={leadProfile}
            onChange={(e) => setLeadProfile(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-200 flex-grow focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
            placeholder="e.g., 'Looking for a graphic designer for a logo project...'"
            disabled={isLoading}
            rows={5}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || files.length === 0}
          className="w-full flex items-center justify-center bg-cyan-600 text-white font-bold py-3 px-4 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500 focus:ring-opacity-50 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Scanning...
            </>
          ) : (
            <>
              <SearchIcon className="mr-2 h-5 w-5" />
              Start Scanning
            </>
          )}
        </button>
      </form>
    </aside>
  );
};

export default Sidebar;
