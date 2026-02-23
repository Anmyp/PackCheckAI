import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { api } from '../../lib/api';

interface EditAIDecisionScreenProps {
  onBack: () => void;
  announcementId: string;
}

export function EditAIDecisionScreen({ onBack, announcementId }: EditAIDecisionScreenProps) {
  const [status, setStatus] = useState<'normal' | 'damaged' | 'review'>('damaged');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [announcementData, setAnnouncementData] = useState<{
    photo_url: string;
    current_status: string;
    seller_name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnnouncement = async () => {
      setLoading(true);
      setError(null);
      try {
        // ✅ ИСПОЛЬЗУЕМ ЕДИНЫЙ МЕТОД API (как в списке объявлений)
        const data = await api.getAnnouncement(announcementId);
        
        setAnnouncementData({
          photo_url: data.photo_url,  // ← УЖЕ ПОЛНЫЙ URL: http://localhost:8000/photos/...
          current_status: data.status,
          seller_name: data.seller_name
        });
      } catch (err) {
        console.error('Ошибка загрузки данных объявления:', err);
        setError('Не удалось загрузить данные объявления');
        
        // Автоматический выход при 401
        if ((err as Error).message.includes('401') || (err as Error).message.includes('Unauthorized')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_name');
          alert('Сессия истекла. Пожалуйста, войдите снова.');
          window.location.href = '/';
        }
      } finally {
        setLoading(false);
      }
    };
    loadAnnouncement();
  }, [announcementId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateAnnouncementStatus(announcementId, status, comment);
      onBack();
    } catch (error) {
      console.error('Ошибка сохранения решения:', error);
      alert('Не удалось сохранить изменения: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentStatusDisplay = () => {
    if (loading) return 'Загрузка...';
    if (!announcementData) return 'Неизвестно';
    const map: Record<string, string> = {
      damaged: '⚠️ Повреждено (ИИ)',
      normal: '✅ Норма (ИИ)',
      review: '🔍 Требует проверки (ИИ)'
    };
    return map[announcementData.current_status] || 'Неизвестно';
  };

  const getStatusColor = () => {
    if (!announcementData) return 'bg-gray-100 text-gray-700';
    switch (announcementData.current_status) {
      case 'damaged': return 'bg-red-50 border border-red-200 text-red-700';
      case 'review': return 'bg-yellow-50 border border-yellow-200 text-yellow-700';
      case 'normal': return 'bg-green-50 border border-green-200 text-green-700';
      default: return 'bg-gray-50 border border-gray-200 text-gray-700';
    }
  };

  return (
    <div>
      <button 
        onClick={onBack} 
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад к списку
      </button>
      
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Редактирование решения ИИ</h2>
        {announcementData?.seller_name && (
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Продавец: {announcementData.seller_name}
          </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          {/* Image — ТОЧНО КАК В СПИСКЕ ОБЪЯВЛЕНИЙ */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Фотография посылки</Label>
            <div className="mt-2 w-full h-80 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="text-center text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Загрузка изображения...</p>
                </div>
              ) : announcementData?.photo_url ? (
                <img
                  src={announcementData.photo_url}  // ← ПРЯМОЙ ИСПОЛЬЗОВАНИЕ КАК В СПИСКЕ
                  alt="Фото посылки"
                  className="w-full h-full object-contain p-4 bg-white"
                  onError={(e) => {
                    console.error('Ошибка загрузки изображения:', announcementData.photo_url);
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="text-center text-gray-400 p-4">
                        <div class="text-6xl mb-2">🖼️</div>
                        <p class="text-gray-500">Изображение недоступно</p>
                        <p class="text-xs mt-1 text-gray-400">URL: ${announcementData.photo_url}</p>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <div className="text-6xl mb-2">🖼️</div>
                  <p className="text-gray-500">Изображение отсутствует</p>
                </div>
              )}
            </div>
          </div>

          {/* Current status */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Текущий статус ИИ</Label>
            <div className={`mt-1 px-4 py-3 rounded-lg font-medium ${getStatusColor()}`}>
              {getCurrentStatusDisplay()}
            </div>
          </div>

          {/* New status */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Новый статус</Label>
            <RadioGroup
              value={status}
              onValueChange={(value) => setStatus(value as any)}
              className="mt-2 space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-colors">
                <RadioGroupItem value="normal" id="normal" className="mt-1" />
                <div>
                  <Label htmlFor="normal" className="font-medium text-green-800 cursor-pointer">✅ Норма</Label>
                  <p className="text-sm text-green-700 mt-1">Посылка без повреждений, готова к отправке</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors">
                <RadioGroupItem value="damaged" id="damaged" className="mt-1" />
                <div>
                  <Label htmlFor="damaged" className="font-medium text-red-800 cursor-pointer">⚠️ Повреждено</Label>
                  <p className="text-sm text-red-700 mt-1">Обнаружены повреждения упаковки</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:border-yellow-300 transition-colors">
                <RadioGroupItem value="review" id="review" className="mt-1" />
                <div>
                  <Label htmlFor="review" className="font-medium text-yellow-800 cursor-pointer">🔍 Требует проверки</Label>
                  <p className="text-sm text-yellow-700 mt-1">Сложный случай, требуется ручная проверка модератором</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">Комментарий модератора</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий для продавца (необязательно)..."
              className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[100px] rounded-lg"
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-500">Комментарий будет отправлен продавцу вместе с уведомлением о смене статуса</p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSaving || loading}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Сохранение...
                </>
              ) : (
                'Сохранить и уведомить продавца'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}