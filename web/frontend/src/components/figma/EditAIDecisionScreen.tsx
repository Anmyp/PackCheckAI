import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api'; // ← импорт API

interface EditAIDecisionScreenProps {
  onBack: () => void;
  announcementId: string; // ← добавлен обязательный пропс
}

export function EditAIDecisionScreen({ onBack, announcementId }: EditAIDecisionScreenProps) {
  const [status, setStatus] = useState<'normal' | 'damaged'>('damaged');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [announcementData, setAnnouncementData] = useState<{
    photo_url: string;
    current_status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Загрузка данных объявления при монтировании
  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        // Здесь предполагается, что у вас есть эндпоинт для получения данных объявления
        // Если такого нет, можно временно использовать данные из списка
        const response = await fetch(`http://localhost:8000/announcements/${announcementId}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncementData({
            photo_url: data.photo_url,
            current_status: data.status
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки данных объявления:', error);
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
      alert('Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentStatusDisplay = () => {
    if (loading) return 'Загрузка...';
    if (!announcementData) return 'Неизвестно';
    return announcementData.current_status === 'damaged' ? 'Повреждено (ИИ)' : 'Норма (ИИ)';
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2>Исправление решения ИИ</h2>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          {/* Image placeholder */}
          <div>
            <Label>Изображение</Label>
            <div className="mt-2 w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              {loading ? (
                <div className="text-center text-gray-400">
                  <div className="animate-pulse text-6xl mb-2">🖼️</div>
                  <p>Загрузка изображения...</p>
                </div>
              ) : announcementData?.photo_url ? (
                <img 
                  src={announcementData.photo_url} 
                  alt="Объявление" 
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-2">🖼️</div>
                  <p>Изображение недоступно</p>
                </div>
              )}
            </div>
          </div>

          {/* Current status */}
          <div>
            <Label>Текущий статус</Label>
            <div className={`mt-2 px-3 py-2 rounded inline-block ${
              loading 
                ? 'bg-gray-100 text-gray-500' 
                : announcementData?.current_status === 'damaged'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {getCurrentStatusDisplay()}
            </div>
          </div>

          {/* Radio buttons for status */}
          <div>
            <Label>Новый статус</Label>
            <RadioGroup value={status} onValueChange={setStatus as any} className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="cursor-pointer">
                  Норма
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="damaged" id="damaged" />
                <Label htmlFor="damaged" className="cursor-pointer">
                  Повреждено
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comment field */}
          <div>
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Введите комментарий к изменению..."
              className="mt-2 border-gray-300 min-h-[120px]"
              disabled={isSaving}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSaving || loading}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
              className="border-gray-300"
              disabled={isSaving}
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}