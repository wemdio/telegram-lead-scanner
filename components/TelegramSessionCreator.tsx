import React, { useState } from 'react';

interface TelegramSessionCreatorProps {
  onSessionCreated: (sessionData: { sessionString: string; userId: string; username: string }) => void;
  apiId: string;
  apiHash: string;
}

const TelegramSessionCreator: React.FC<TelegramSessionCreatorProps> = ({ onSessionCreated, apiId, apiHash }) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearSession = async () => {
    setIsClearing(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/clear-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setError(null);
        // Показываем успешное сообщение
        alert('Сессия очищена успешно. Теперь можно создать новую сессию.');
      } else {
        setError(data.error || 'Ошибка при очистке сессии');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером при очистке сессии');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber || !apiId || !apiHash) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          apiId,
          apiHash,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneCodeHash(data.phoneCodeHash);
        setStep('code');
      } else {
        setError(data.error || 'Ошибка при отправке кода');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phoneCode) {
      setError('Пожалуйста, введите код подтверждения');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          phoneCode,
          phoneCodeHash,
        }),
      });

      const data = await response.json();
      console.log('Ответ от сервера:', data);
      console.log('Полная структура ответа:', JSON.stringify(data, null, 2));
      
      // Извлекаем данные из правильного места в ответе
      const sessionString = data.sessionString;
      const userId = data.userId;
      const username = data.username;
      
      console.log('Извлеченные данные:', {
        sessionString: sessionString ? 'Присутствует' : 'Отсутствует',
        sessionStringLength: sessionString?.length || 0,
        userId,
        username
      });

      if (response.ok) {
        console.log('Сессия создана успешно:', {
          sessionString: sessionString ? 'Присутствует' : 'Отсутствует',
          userId,
          username
        });
        
        // Проверяем, что все необходимые поля присутствуют
        if (!sessionString) {
          console.error('sessionString отсутствует в ответе сервера');
          console.error('Полный ответ сервера:', data);
          setError('Ошибка: сервер не вернул session string');
          return;
        }
        
        onSessionCreated({
          sessionString: sessionString,
          userId: userId || '',
          username: username || '',
        });
        // Reset form
        setStep('phone');
        setPhoneNumber('');
        setPhoneCode('');
        setPhoneCodeHash('');
      } else {
        setError(data.error || 'Ошибка при проверке кода');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setPhoneCode('');
    setError(null);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        Создать новую Telegram сессию
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Номер телефона (с кодом страны)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+79123456789"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSendCode}
              disabled={isLoading || !apiId || !apiHash}
              className="w-full btn-polza px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </button>
            
            <button
              onClick={handleClearSession}
              disabled={isClearing}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Очистка...' : 'Очистить старую сессию'}
            </button>
          </div>

          <div className="text-sm text-slate-400">
            <p>Получите API ID и API Hash на <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">my.telegram.org</a></p>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Код подтверждения
            </label>
            <input
              type="text"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              placeholder="Введите код из Telegram"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-slate-600 text-slate-100 rounded-md hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="flex-1 btn-polza px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Проверка...' : 'Подтвердить'}
            </button>
          </div>

          <div className="text-sm text-slate-400">
            <p>Введите код, который пришел в Telegram на номер {phoneNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramSessionCreator;