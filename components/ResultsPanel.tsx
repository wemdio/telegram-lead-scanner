import React from 'react';
import { Lead } from '../types';
import LeadCard from './LeadCard';
import { LoaderIcon } from './icons/LoaderIcon';
import { BotIcon } from './icons/BotIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ResultsPanelProps {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  hasScanned: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ leads, isLoading, error, hasScanned }) => {
  const escapeCsvCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      // Enclose in double quotes and escape existing double quotes
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const handleExport = () => {
    if (leads.length === 0) return;

    const headers = ['Channel', 'Author', 'Timestamp', 'Message', 'Reason'];
    const csvRows = [
      headers.join(','), // header row
      ...leads.map(lead => [
        escapeCsvCell(lead.channel),
        escapeCsvCell(lead.author),
        escapeCsvCell(lead.timestamp),
        escapeCsvCell(lead.message),
        escapeCsvCell(lead.reason),
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'telegram_leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <LoaderIcon className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
        <p className="text-lg">AI is analyzing messages...</p>
        <p className="text-sm">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg max-w-lg text-center">
          <h3 className="text-xl font-semibold mb-2">Scan Failed</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!hasScanned) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <BotIcon className="w-24 h-24 mb-4 text-slate-700"/>
            <h2 className="text-2xl font-bold text-slate-400">Welcome to the Lead Scanner</h2>
            <p className="mt-2 max-w-lg">
                This tool uses AI to find potential leads from your Telegram chat history.
            </p>
            <div className="mt-6 text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700 max-w-md">
                <h3 className="font-semibold text-slate-300 mb-2">How to get started:</h3>
                <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Open Telegram Desktop and go to a channel/chat.</li>
                    <li>Click the three dots (⋮) &gt; <span className="font-mono bg-slate-700/50 px-1 rounded">Export chat history</span>.</li>
                    <li>Deselect all media, and set format to <span className="font-mono bg-slate-700/50 px-1 rounded">Machine-readable JSON</span>.</li>
                    <li>Upload the exported <span className="font-mono bg-slate-700/50 px-1 rounded">result.json</span> file in the sidebar.</li>
                    <li>Describe your ideal lead and click "Start Scanning".</li>
                </ol>
            </div>
        </div>
     );
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <h3 className="text-xl font-semibold">No Leads Found</h3>
          <p>Try adjusting your lead profile or upload a different chat history.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-300">
                Found {leads.length} potential lead{leads.length > 1 ? 's' : ''}
            </h3>
            <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors duration-200 text-sm"
                aria-label="Export leads to CSV file"
            >
                <DownloadIcon className="w-4 h-4" />
                Export as CSV
            </button>
        </div>
        <div className="space-y-4">
        {leads.map((lead, index) => (
            <LeadCard key={index} lead={lead} />
        ))}
        </div>
    </div>
  );
};

export default ResultsPanel;