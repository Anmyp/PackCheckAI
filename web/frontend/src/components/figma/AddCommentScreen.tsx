import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api'; // ← импорт API

interface AddCommentScreenProps {
  onBack: () => void;
  announcementId: string; // ← добавлен обязательный пропс
}

export function AddCommentScreen({ onBack, announcementId }: AddCommentScreenProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.addComment(announcementId, comment);
      onBack();
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      alert('Не удалось добавить комментарий');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2>Добавление комментария</h2>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="commentText">Комментарий</Label>
            <Textarea
              id="commentText"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Введите ваш комментарий..."
              className="mt-2 border-gray-300 min-h-[200px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSend}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting || !comment.trim()}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
              className="border-gray-300"
              disabled={isSubmitting}
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}