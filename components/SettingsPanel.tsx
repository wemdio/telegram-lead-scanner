import React, { useState, useEffect } from 'react';
import { ScannerSettings } from '../types';

interface SettingsPanelProps {
  scanInterval: number;
  onSettingsChange: (settings: { scanInterval: number }) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  scanInterval, 
  onSettingsChange 
}) => {
  const [localScanInterval, setLocalScanInterval] = useState(scanInterval || 24);

  // Sync local state with props when settings change
  useEffect(() => {
    setLocalScanInterval(scanInterval || 24);
  }, [scanInterval]);

  const handleScanIntervalChange = (value: number) => {
    setLocalScanInterval(value);
    // Auto-save to localStorage
    localStorage.setItem('scanInterval', value.toString());
    // Update parent component
    onSettingsChange({
      scanInterval: value,
    });
  };

  const handleSaveSettings = () => {
    // Settings are already saved automatically, just show confirmation
    alert('Настройки сохранены');
  };

  return (
    <div className="overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Настройки сканера</h2>
        
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          {/* Scan Interval */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Интервал автоматического сканирования (часы)
            </label>
            <select
              value={localScanInterval}
              onChange={(e) => handleScanIntervalChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value={1}>Каждый час</option>
              <option value={2}>Каждые 2 часа</option>
              <option value={4}>Каждые 4 часа</option>
              <option value={6}>Каждые 6 часов</option>
              <option value={12}>Каждые 12 часов</option>
              <option value={24}>Каждые 24 часа</option>
            </select>
            <p className="mt-2 text-sm text-slate-400">
              Как часто сканер будет автоматически проверять новые сообщения в выбранных чатах
            </p>
          </div>
          
          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSaveSettings}
              className="btn-polza w-full px-4 py-2"
            >
              Сохранить настройки
            </button>
          </div>
          
          {/* Info Section */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-200 mb-2">Информация</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Автоматическое сканирование запускается через заданный интервал</li>
              <li>• Настройки Telegram API и Google Sheets настраиваются в разделе "Сканер"</li>
              <li>• Настройки AI для анализа лидов находятся в разделе "Лиды"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;