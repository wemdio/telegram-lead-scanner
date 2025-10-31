import React, { useState } from 'react';
import { Upload, Key, Server, AlertCircle, CheckCircle, Globe } from 'lucide-react';

interface AuthKeyUploaderProps {
  onAccountAdded?: (account: any) => void;
  onClose?: () => void;
}

const AuthKeyUploader: React.FC<AuthKeyUploaderProps> = ({ onAccountAdded, onClose }) => {
  const [authKey, setAuthKey] = useState('');
  const [dcId, setDcId] = useState('');
  const [accountName, setAccountName] = useState('');
  // Добавляем состояния для прокси
  const [useProxy, setUseProxy] = useState(false);
  const [proxyType, setProxyType] = useState('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateAuthKey = (key: string): boolean => {
    // Проверяем, что это hex строка длиной 512 символов (256 байт)
    const hexRegex = /^[0-9a-fA-F]{512}$/;
    return hexRegex.test(key);
  };

  const validateDcId = (id: string): boolean => {
    const num = parseInt(id);
    return !isNaN(num) && num >= 1 && num <= 5;
  };

  const validateProxy = (): boolean => {
    if (!useProxy) return true;
    
    if (!proxyHost.trim()) {
      setError('Хост прокси обязателен при использовании прокси');
      return false;
    }
    
    const port = parseInt(proxyPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError('Порт прокси должен быть числом от 1 до 65535');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Валидация
    if (!authKey.trim()) {
      setError('Auth Key обязателен');
      return;
    }

    if (!validateAuthKey(authKey.trim())) {
      setError('Auth Key должен быть hex строкой длиной 512 символов (256 байт)');
      return;
    }

    if (!dcId.trim()) {
      setError('DC ID обязателен');
      return;
    }

    if (!validateDcId(dcId.trim())) {
      setError('DC ID должен быть числом от 1 до 5');
      return;
    }

    if (!validateProxy()) {
      return;
    }

    setIsLoading(true);

    try {
      const requestBody: any = {
        authKey: authKey.trim(),
        dcId: parseInt(dcId.trim()),
        accountName: accountName.trim() || undefined,
      };

      // Добавляем данные прокси если они указаны
      if (useProxy) {
        requestBody.proxy = {
          type: proxyType,
          host: proxyHost.trim(),
          port: parseInt(proxyPort),
          username: proxyUsername.trim() || undefined,
          password: proxyPassword.trim() || undefined,
        };
      }

      const response = await fetch('/api/telegram/create-session-from-authkey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Аккаунт успешно добавлен!');
        if (onAccountAdded) {
          onAccountAdded(data.account);
        }
        // Очищаем форму
        setAuthKey('');
        setDcId('');
        setAccountName('');
        setUseProxy(false);
        setProxyHost('');
        setProxyPort('');
        setProxyUsername('');
        setProxyPassword('');
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 2000);
      } else {
        setError(data.error || 'Ошибка при добавлении аккаунта');
      }
    } catch (error) {
      console.error('Error creating account from auth key:', error);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthKeyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.replace(/\s/g, ''); // Удаляем пробелы
    setAuthKey(value);
    setError('');
  };

  const handleDcIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDcId(e.target.value);
    setError('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Key className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Подключение через Auth Key
          </h3>
          <p className="text-sm text-gray-600">
            Введите Auth Key и DC ID для подключения аккаунта
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Auth Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Auth Key (hex) *
          </label>
          <textarea
            value={authKey}
            onChange={handleAuthKeyChange}
            placeholder="Введите Auth Key в hex формате (512 символов)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
            rows={4}
            required
          />
          <div className="mt-1 text-xs text-gray-500">
            Длина: {authKey.length}/512 символов
          </div>
        </div>

        {/* DC ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DC ID *
          </label>
          <select
            value={dcId}
            onChange={handleDcIdChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Выберите DC ID</option>
            <option value="1">1 - США, Майами</option>
            <option value="2">2 - Нидерланды, Амстердам</option>
            <option value="3">3 - США, Майами</option>
            <option value="4">4 - Нидерланды, Амстердам</option>
            <option value="5">5 - Сингапур</option>
          </select>
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название аккаунта (опционально)
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Например: Мой аккаунт DC5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Proxy Settings */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-gray-600" />
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={useProxy}
                onChange={(e) => setUseProxy(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Использовать прокси
            </label>
          </div>

          {useProxy && (
            <div className="space-y-3 pl-6 border-l-2 border-blue-100">
              {/* Proxy Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип прокси
                </label>
                <select
                  value={proxyType}
                  onChange={(e) => setProxyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>

              {/* Proxy Host and Port */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Хост *
                  </label>
                  <input
                    type="text"
                    value={proxyHost}
                    onChange={(e) => setProxyHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Порт *
                  </label>
                  <input
                    type="number"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(e.target.value)}
                    placeholder="8080"
                    min="1"
                    max="65535"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Proxy Authentication */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Логин (опционально)
                  </label>
                  <input
                    type="text"
                    value={proxyUsername}
                    onChange={(e) => setProxyUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Пароль (опционально)
                  </label>
                  <input
                    type="password"
                    value={proxyPassword}
                    onChange={(e) => setProxyPassword(e.target.value)}
                    placeholder="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || !authKey || !dcId || (useProxy && (!proxyHost || !proxyPort))}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Создание...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Добавить аккаунт
              </>
            )}
          </button>
          
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Отмена
            </button>
          )}
        </div>
      </form>

      {/* Info */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <Server className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Как получить Auth Key:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Используйте специальные инструменты для извлечения</li>
              <li>Auth Key должен быть в hex формате (512 символов)</li>
              <li>DC ID указывает на дата-центр Telegram (1-5)</li>
              <li>Прокси поможет обойти блокировки (опционально)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthKeyUploader;