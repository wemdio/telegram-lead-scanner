import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface PyrogramUploaderProps {
  onSessionAdded: () => void;
}

const PyrogramUploader: React.FC<PyrogramUploaderProps> = ({ onSessionAdded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.session')) {
        setSelectedFile(file);
        setError('');
        // Автоматически заполняем имя аккаунта из имени файла
        const fileName = file.name.replace('.session', '');
        setAccountName(fileName);
      } else {
        setError('Пожалуйста, выберите файл с расширением .session');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !apiId || !apiHash) {
      setError('Пожалуйста, заполните все поля и выберите файл');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      // Создаем временный путь для файла
      const tempPath = `temp_sessions/${selectedFile.name}`;
      
      // Читаем файл как ArrayBuffer
      const fileBuffer = await selectedFile.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);

      // Отправляем данные на сервер
      const response = await fetch('/api/telegram/accounts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'pyrogram',
          path: tempPath,
          name: accountName || selectedFile.name.replace('.session', ''),
          apiId: apiId,
          apiHash: apiHash,
          fileData: Array.from(fileData) // Конвертируем в массив для JSON
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Pyrogram сессия успешно добавлена!');
        setSelectedFile(null);
        setApiId('');
        setApiHash('');
        setAccountName('');
        onSessionAdded();
        
        // Очищаем форму через 3 секунды
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(result.error || 'Ошибка при добавлении сессии');
      }
    } catch (error) {
      console.error('Error uploading Pyrogram session:', error);
      setError('Ошибка при загрузке файла сессии');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Загрузить Pyrogram сессию</h3>
      </div>

      <div className="space-y-4">
        {/* Выбор файла */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Файл сессии (.session)
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".session"
              onChange={handleFileSelect}
              className="hidden"
              id="pyrogram-file-input"
            />
            <label
              htmlFor="pyrogram-file-input"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {!selectedFile ? (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Нажмите для выбора .session файла или перетащите его сюда
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Поддерживаются только Pyrogram .session файлы
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* API ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API ID
          </label>
          <input
            type="text"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            placeholder="Введите API ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* API Hash */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Hash
          </label>
          <input
            type="text"
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            placeholder="Введите API Hash"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Имя аккаунта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Имя аккаунта (опционально)
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Введите имя для аккаунта"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Pyrogram сессия успешно загружена!</span>
          </div>
        )}

        {/* Кнопка загрузки */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !apiId || !apiHash || isUploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <span>Добавить сессию</span>
          )}
        </button>
      </div>

      {/* Информация */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Примечание:</strong> Pyrogram сессии будут автоматически конвертированы в формат gramJS для совместимости с приложением.
        </p>
      </div>
    </div>
  );
};

export default PyrogramUploader;