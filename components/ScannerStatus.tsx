import React from 'react';
import { ScanStatus, ScanHistoryItem } from '../types';
import { LoaderIcon } from './icons/LoaderIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ScannerStatusProps {
  status: ScanStatus;
  history: ScanHistoryItem[];
  onManualScan: () => void;
  onStop: () => void;
  onOpenSpreadsheet: () => void;
  isLoading: boolean;
}

const ScannerStatus: React.FC<ScannerStatusProps> = ({
  status,
  history,
  onManualScan,
  onStop,
  onOpenSpreadsheet,
  isLoading
}) => {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Никогда';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getStatusColor = () => {
    if (status.isRunning) return 'text-yellow-400';
    if (status.lastError) return 'text-red-400';
    if (status.isScheduled) return 'text-green-400';
    return 'text-slate-400';
  };

  const getStatusText = () => {
    if (status.isRunning) return 'Сканирование...';
    if (status.lastError) return `Ошибка: ${status.lastError}`;
    if (status.isScheduled) return 'Активен';
    return 'Остановлен';
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Статус сканера</h3>
          <div className={`flex items-center gap-2 ${getStatusColor()}`}>
            {status.isRunning && <LoaderIcon className="w-4 h-4" />}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-sm">Последнее сканирование:</span>
              <div className="text-slate-100 font-mono">{formatDate(status.lastScanTime)}</div>
            </div>
            
            <div>
              <span className="text-slate-400 text-sm">Следующее сканирование:</span>
              <div className="text-slate-100 font-mono">{formatDate(status.nextScanTime)}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-sm">Всего сообщений:</span>
              <div className="text-slate-100 font-mono text-lg">{status.totalMessages.toLocaleString()}</div>
            </div>
            
            <div>
              <span className="text-slate-400 text-sm">Статус расписания:</span>
              <div className={`font-medium ${
                status.isRunning ? 'text-green-400' : 'text-red-400'
              }`}>
                {status.isRunning ? 'Включено' : 'Выключено'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Управление</h3>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              console.log('🔘 Кнопка "Запустить сканирование" нажата!');
              console.log('📊 Status:', { isRunning: status.isRunning, isLoading });
              onManualScan();
            }}
            disabled={status.isRunning || isLoading}
            className="btn-polza flex items-center gap-2 px-4 py-2"
          >
            {status.isRunning ? (
              <LoaderIcon className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Запустить сканирование
          </button>
          
          <button
            onClick={onStop}
            disabled={!status.isRunning || isLoading}
            className="btn-polza-danger flex items-center gap-2 px-4 py-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Остановить сканер
          </button>
          
          <button
            onClick={onOpenSpreadsheet}
            className="btn-polza-success flex items-center gap-2 px-4 py-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Открыть таблицу
          </button>
        </div>
      </div>

      {/* Scan History */}
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">История сканирований</h3>
        
        {history.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            История сканирований пуста
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.slice().reverse().map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-md ${
                  item.success ? 'bg-green-900/20 border border-green-700/30' : 'bg-red-900/20 border border-red-700/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.success ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <div className="text-slate-100 font-medium">
                      {formatDate(item.timestamp)}
                    </div>
                    {item.error && (
                      <div className="text-red-400 text-sm">{item.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-medium ${
                    item.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {item.success ? 'Успешно' : 'Ошибка'}
                  </div>
                  {item.success && (
                    <div className="text-slate-400 text-sm">
                      {item.messagesCount} сообщений
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerStatus;