import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { api } from '../../lib/api'; // ← импорт API

interface StatisticsData {
  total: number;
  normal_percent: number;
  damaged_percent: number;
  chart_data: Array<{
    name: string;
    normal: number;
    damaged: number;
  }>;
}

export function StatisticsScreen() {
  const [dateFrom, setDateFrom] = useState('2025-10-01');
  const [dateTo, setDateTo] = useState('2025-10-26');
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStatistics();
      setStats({
        total: data.total,
        normal_percent: data.normal_percent,
        damaged_percent: data.damaged_percent,
        chart_data: data.chart_data || []
      });
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setError('Не удалось загрузить статистику');
      
      // Демо-данные для работы
      setStats({
        total: 1247,
        normal_percent: 73.5,
        damaged_percent: 26.5,
        chart_data: [
          { name: 'Пн', normal: 120, damaged: 45 },
          { name: 'Вт', normal: 135, damaged: 38 },
          { name: 'Ср', normal: 142, damaged: 52 },
          { name: 'Чт', normal: 128, damaged: 41 },
          { name: 'Пт', normal: 155, damaged: 48 },
          { name: 'Сб', normal: 98, damaged: 32 },
          { name: 'Вс', normal: 89, damaged: 24 },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Предполагается эндпоинт для экспорта статистики
      const response = await fetch(`http://localhost:8000/statistics/export?date_from=${dateFrom}&date_to=${dateTo}`);
      if (!response.ok) throw new Error('Ошибка экспорта');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistics_${dateFrom}_to_${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      setError('Не удалось экспортировать данные');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка статистики...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-red-600">Ошибка загрузки данных</div>;
  }

  return (
    <div>
      <h2 className="mb-6">Статистика верификации</h2>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          {/* Date selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">Дата с</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-2 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Дата по</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-2 border-gray-300"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Statistics cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-gray-600 mb-1">Всего проверено</div>
              <div className="text-blue-600">{stats.total.toLocaleString()}</div>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-gray-600 mb-1">Норма</div>
              <div className="text-green-600">{stats.normal_percent}%</div>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-gray-600 mb-1">Повреждено</div>
              <div className="text-red-600">{stats.damaged_percent}%</div>
            </div>
          </div>

          {/* Bar chart */}
          <div>
            <Label className="mb-3 block">График проверок</Label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value) => [value, 'Количество']}
                    labelFormatter={(name) => `День: ${name}`}
                  />
                  <Bar dataKey="normal" fill="#10b981" name="Норма" />
                  <Bar dataKey="damaged" fill="#ef4444" name="Повреждено" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Export button */}
          <div className="pt-4">
            <Button 
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}