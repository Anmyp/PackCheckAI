import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api'; // ← импорт API

interface Announcement {
  id: string;
  photo_url: string;
  date: string;
  status: 'normal' | 'damaged';
  comments_count: number;
}

interface AnnouncementsListScreenProps {
  onEditDecision: (id: string) => void; // ← передаём ID объявления
  onViewComments: (id: string) => void; // ← передаём ID объявления
}

export function AnnouncementsListScreen({ onEditDecision, onViewComments }: AnnouncementsListScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Ошибка загрузки объявлений:', err);
      setError('Не удалось загрузить объявления');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter((item) =>
    item.id.includes(searchQuery)
  );

  const handleRefresh = () => {
    loadAnnouncements();
  };

  const getStatusDisplay = (status: string) => {
    return status === 'damaged' ? 'Повреждено' : 'Норма';
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка объявлений...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <Button onClick={handleRefresh} className="mt-2 bg-red-600 hover:bg-red-700 text-white">
          Повторить попытку
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6">Список объявлений</h2>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="flex gap-3 mb-6">
          <Input
            type="text"
            placeholder="Поиск по ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-gray-300"
          />
          <Button 
            variant="outline" 
            className="border-gray-300"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Объявления не найдены
          </div>
        ) : (
          <div className="border border-gray-300 rounded">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="border-b border-gray-300">ID</TableHead>
                  <TableHead className="border-b border-gray-300">Фото</TableHead>
                  <TableHead className="border-b border-gray-300">Дата</TableHead>
                  <TableHead className="border-b border-gray-300">Статус</TableHead>
                  <TableHead className="border-b border-gray-300">Комментарии</TableHead>
                  <TableHead className="border-b border-gray-300">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="border-b border-gray-200">{item.id}</TableCell>
                    <TableCell className="border-b border-gray-200">
                      <div className="w-12 h-12 bg-gray-100 border border-gray-300 flex items-center justify-center rounded">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="Объявление" className="w-full h-full object-cover rounded" />
                        ) : (
                          '📷'
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-b border-gray-200">{item.date}</TableCell>
                    <TableCell className="border-b border-gray-200">
                      <span
                        className={`px-2 py-1 rounded ${
                          item.status === 'damaged'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {getStatusDisplay(item.status)}
                      </span>
                    </TableCell>
                    <TableCell className="border-b border-gray-200">
                      <button
                        onClick={() => onViewComments(item.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                        <MessageSquare className="h-4 w-4" />
                        {item.comments_count > 0 ? item.comments_count : ''}
                      </button>
                    </TableCell>
                    <TableCell className="border-b border-gray-200">
                      <Button
                        onClick={() => onEditDecision(item.id)} // ← передаём ID
                        variant="outline"
                        size="sm"
                        className="border-gray-300"
                      >
                        Редактировать
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}