import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { api } from '../../lib/api';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>; // ← обновленный тип
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!login.trim() || !password.trim()) {
    setError('Пожалуйста, заполните все поля');
    return;
  }

  setIsLoading(true);
  setError(null);
  
  try {
    // ДОЛЖНО БЫТЬ ТАК:
    await onLogin(login, password); // ← передаём логин и пароль
  } catch (error) {
    console.error('Ошибка входа:', error);
    setError('Неверный логин или пароль');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-300 rounded-lg p-8">
          <h2 className="text-center mb-8">Вход в систему</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  if (error) setError(null);
                }}
                className="border-gray-300"
                placeholder="Введите логин"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="border-gray-300"
                placeholder="Введите пароль"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}