import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { api } from '../../lib/api';

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
        // ✅ ИСПОЛЬЗУЕМ api.getProfile() вместо прямого fetch
        const data = await api.getProfile();
        
        setProfile({
          name: data.name || 'Имя не указано',
          email: data.email || 'email@example.com',
          role: data.role === 'admin' ? 'Администратор' : 'Модератор',
        });
        setOriginalProfile({
          name: data.name || 'Имя не указано',
          email: data.email || 'email@example.com',
          role: data.role === 'admin' ? 'Администратор' : 'Модератор',
        });
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        setError('Не удалось загрузить данные профиля');
        
        // Демо-данные только для отладки
        const demoData = {
          name: 'Демо пользователь',
          email: 'demo@example.com',
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
      // ✅ ИСПОЛЬЗУЕМ api для обновления профиля
      const updatedProfile = await api.updateProfile({
        name: profile.name,
        email: profile.email,
      });
      
      setProfile({
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role === 'admin' ? 'Администратор' : 'Модератор',
      });
      setOriginalProfile({
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role === 'admin' ? 'Администратор' : 'Модератор',
      });
      
      setIsEditing(false);
      alert('✅ Профиль успешно обновлён');
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      setError('Не удалось сохранить изменения: ' + (err as Error).message);
      alert('❌ Ошибка сохранения профиля');
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
    return (
      <div className="max-w-2xl">
        <h2 className="mb-6">Личные данные</h2>
        <div className="bg-white border border-gray-300 rounded-lg p-6 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Загрузка профиля...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Личные данные</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Полное имя
            </Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditing || saving}
              className={`mt-1 ${isEditing ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' : 'border-gray-300 bg-gray-50'}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing || saving}
              className={`mt-1 ${isEditing ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' : 'border-gray-300 bg-gray-50'}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-gray-700">
              Роль в системе
            </Label>
            <Input
              id="role"
              value={profile.role}
              disabled
              className="mt-1 border-gray-300 bg-gray-50 text-gray-600 font-medium"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                disabled={saving}
              >
                Редактировать профиль
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить изменения'
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 flex-1"
                  disabled={saving}
                >
                  Отменить
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}