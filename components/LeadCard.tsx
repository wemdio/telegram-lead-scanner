
import React from 'react';
import { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onMarkAsContacted?: (leadId: string) => void;
  onOpenMessage?: (lead: Lead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onMarkAsContacted, onOpenMessage }) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-5 shadow-lg transition-all hover:border-cyan-500/50 hover:shadow-cyan-500/10">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <p className="font-bold text-lg text-slate-100">{lead.author}</p>
            {lead.contacted && (
              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                Связались
              </span>
            )}
          </div>
          <p className="text-sm text-cyan-400 font-mono">{lead.channel}</p>
          {lead.confidence && (
            <p className="text-sm text-green-400 font-medium">{lead.confidence}% релевантности</p>
          )}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {new Date(lead.timestamp).toLocaleString('ru-RU')}
        </span>
      </div>
      <p className="text-slate-300 mb-4 whitespace-pre-wrap">{lead.message}</p>
      <div className="bg-slate-900/70 p-3 rounded-md border-l-4 border-cyan-500 mb-4">
        <p className="text-sm font-semibold text-slate-300">AI Analysis:</p>
        <p className="text-sm text-slate-400 italic">"{lead.reason}"</p>
      </div>
      
      {/* Кнопки действий */}
      <div className="flex space-x-2">
        {onOpenMessage && (
          <button
            onClick={() => onOpenMessage(lead)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Написать
          </button>
        )}
        
        {onMarkAsContacted && !lead.contacted && (
          <button
            onClick={() => onMarkAsContacted(lead.id)}
            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Связались
          </button>
        )}
        
        {lead.contacted && lead.contactDate && (
          <div className="flex-1 px-3 py-2 bg-slate-600 text-slate-300 text-sm rounded flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(lead.contactDate).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCard;
