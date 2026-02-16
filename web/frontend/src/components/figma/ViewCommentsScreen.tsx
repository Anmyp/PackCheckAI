import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../../lib/api'; // ← импорт API

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

interface ViewCommentsScreenProps {
  onAddComment: (announcementId: string) => void; // ← передаём ID объявления
  onBack: () => void;
  announcementId: string; // ← добавлен обязательный пропс
}

export function ViewCommentsScreen({ onAddComment, onBack, announcementId }: ViewCommentsScreenProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComments(announcementId);
      setComments(data);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
      setError('Не удалось загрузить комментарии');
      
      // Демо-данные для работы
      setComments([
        {
          id: '1',
          user: 'Иван Иванов',
          text: 'Изображение действительно показывает повреждение упаковки',
          timestamp: '2025-10-24 14:30',
        },
        {
          id: '2',
          user: 'Мария Петрова',
          text: 'Согласна с решением ИИ, товар поврежден',
          timestamp: '2025-10-24 15:45',
        },
        {
          id: '3',
          user: 'Сергей Сидоров',
          text: 'Требуется дополнительная проверка',
          timestamp: '2025-10-25 09:15',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [announcementId]);

  if (loading) {
    return <div className="text-center py-8">Загрузка комментариев...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold">Комментарии</h2>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Комментарии отсутствуют
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-blue-600 font-medium">{comment.user}</span>
                  <span className="text-gray-500 text-sm">{comment.timestamp}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => onAddComment(announcementId)} // ← передаём ID
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить комментарий
        </Button>
      </div>
    </div>
  );
}