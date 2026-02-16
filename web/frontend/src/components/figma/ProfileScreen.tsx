import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { api } from '../../lib/api'; // ← импорт API

interface ProfileData {
  name: string;
  email: string;
  role: string;
}

export function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    role: '',
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка профиля при монтировании
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Предполагается, что у вас есть эндпоинт /profile
        const response = await fetch('http://localhost:8000/profile', {
          credentials: 'include' // если используется аутентификация через cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setOriginalProfile(data);
        } else {
          throw new Error('Не удалось загрузить профиль');
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        setError('Не удалось загрузить данные профиля');
        // Устанавливаем демо-данные для работы
        const demoData = {
          name: 'Иван Иванов',
          email: 'ivan@example.com',
          role: 'Модератор',
        };
        setProfile(demoData);
        setOriginalProfile(demoData);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!originalProfile) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Предполагается эндпоинт для обновления профиля
      const response = await fetch('http://localhost:8000/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          // роль обычно не редактируется
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setOriginalProfile(updatedProfile);
        setIsEditing(false);
      } else {
        throw new Error('Не удалось сохранить изменения');
      }
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalProfile) {
      setProfile(originalProfile);
    }
    setIsEditing(false);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка профиля...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6">Личные данные</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditing || saving}
              className="border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing || saving}
              className="border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Input
              id="role"
              value={profile.role}
              disabled
              className="border-gray-300 bg-gray-50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={saving}
              >
                Редактировать
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300"
                  disabled={saving}
                >
                  Отмена
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}