import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../../lib/api';

interface StatisticsData {
  total: number;
  normal_percent: number;
  damaged_percent: number;
  review_percent?: number;
  chart_data: Array<{
    name: string;
    normal: number;
    damaged: number;
    review?: number;
  }>;
}

export function StatisticsScreen() {
  // Минимальная допустимая дата (1 января 2020)
  const MIN_DATE = '2020-01-01';
  const MAX_DATE = new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    return weekAgo.toISOString().split('T')[0];
  });
  
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedDateFrom, setAppliedDateFrom] = useState(dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(dateTo);

  const loadStatistics = async (from: string, to: string) => {
    // Валидация дат перед загрузкой
    if (new Date(from) > new Date(to)) {
      setError('Дата "с" не может быть позже даты "по"');
      return;
    }
    
    if (from < MIN_DATE || to < MIN_DATE) {
      setError(`Дата не может быть раньше ${MIN_DATE}`);
      return;
    }
    
    if (from > MAX_DATE || to > MAX_DATE) {
      setError(`Дата не может быть позже ${MAX_DATE}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const blob = await api.generateReport({
        dateFrom: from,
        dateTo: to,
        marketplace: 'all'
      });
      
      const text = await blob.text();
      const rows = text.trim().split('\n');
      
      // Пропускаем заголовок
      if (rows.length <= 1) {
        throw new Error('Нет данных за выбранный период');
      }
      
      // Подсчитываем статистику из данных
      let normal = 0, damaged = 0, review = 0;
      const chartData: { [key: string]: { normal: number, damaged: number, review: number } } = {};
      
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i]
          .split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map(c => c.replace(/^"|"$/g, ''));
        
        if (cells.length < 3) continue;
        
        const status = cells[2].toLowerCase().trim();
        const dateStr = cells[1].split(' ')[0]; // Берём только дату без времени
        
        // Преобразуем дату в день недели
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        
        if (!chartData[dayName]) {
          chartData[dayName] = { normal: 0, damaged: 0, review: 0 };
        }
        
        switch (status) {
          case 'normal': 
            normal++; 
            chartData[dayName].normal++; 
            break;
          case 'damaged': 
            damaged++; 
            chartData[dayName].damaged++; 
            break;
          case 'review': 
            review++; 
            chartData[dayName].review++; 
            break;
        }
      }
      
      const total = normal + damaged + review;
      
      setStats({
        total: total,
        normal_percent: total ? (normal / total) * 100 : 0,
        damaged_percent: total ? (damaged / total) * 100 : 0,
        review_percent: total ? (review / total) * 100 : 0,
        chart_data: Object.keys(chartData).map(name => ({
          name,
          normal: chartData[name].normal,
          damaged: chartData[name].damaged,
          review: chartData[name].review
        }))
      });
      
      // Сохраняем применённые даты
      setAppliedDateFrom(from);
      setAppliedDateTo(to);
      
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setError('Не удалось загрузить статистику за выбранный период. Проверьте даты.');
      
      // Демо-данные только для отладки
      setStats({
        total: 1247,
        normal_percent: 73.5,
        damaged_percent: 26.5,
        review_percent: 0.0,
        chart_data: [
          { name: 'Пн', normal: 120, damaged: 45, review: 5 },
          { name: 'Вт', normal: 135, damaged: 38, review: 7 },
          { name: 'Ср', normal: 142, damaged: 52, review: 6 },
          { name: 'Чт', normal: 128, damaged: 41, review: 4 },
          { name: 'Пт', normal: 155, damaged: 48, review: 7 },
          { name: 'Сб', normal: 98, damaged: 32, review: 10 },
          { name: 'Вс', normal: 89, damaged: 24, review: 7 },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при первом монтировании (последние 7 дней)
  useEffect(() => {
    loadStatistics(dateFrom, dateTo);
  }, []);

  const handleApply = () => {
    loadStatistics(dateFrom, dateTo);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.generateReport({
        dateFrom: appliedDateFrom,
        dateTo: appliedDateTo,
        marketplace: 'all'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packcheck_report_${appliedDateFrom.replace(/-/g, '')}_${appliedDateTo.replace(/-/g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ Отчёт успешно экспортирован!');
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      setError('Не удалось экспортировать данные');
      alert('❌ Ошибка при экспорте отчёта');
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    loadStatistics(appliedDateFrom, appliedDateTo);
  };

  if (loading && !stats) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-gray-600">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Статистика верификации</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-gray-300"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          {/* Date selectors with Apply button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Дата с
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                min={MIN_DATE}
                max={MAX_DATE}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Дата по
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                min={MIN_DATE}
                max={MAX_DATE}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleApply}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                disabled={loading}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Загрузка...' : 'Применить'}
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Statistics cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                <div className="text-gray-600 mb-1 text-sm">Всего проверено</div>
                <div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</div>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                <div className="text-gray-600 mb-1 text-sm">Норма</div>
                <div className="text-2xl font-bold text-green-600">{stats.normal_percent.toFixed(1)}%</div>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                <div className="text-gray-600 mb-1 text-sm">Повреждено</div>
                <div className="text-2xl font-bold text-red-600">{stats.damaged_percent.toFixed(1)}%</div>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                <div className="text-gray-600 mb-1 text-sm">Требует проверки</div>
                <div className="text-2xl font-bold text-yellow-600">{(stats.review_percent || 0).toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Bar chart */}
          {stats && (
            <div>
              <Label className="mb-3 block text-sm font-medium text-gray-700">
                График проверок: {appliedDateFrom} — {appliedDateTo}
              </Label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stats.chart_data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Количество']}
                      labelFormatter={(name) => `День: ${name}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="normal" fill="#10b981" name="Норма" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="damaged" fill="#ef4444" name="Повреждено" radius={[4, 4, 0, 0]} />
                    {stats.chart_data.some(item => (item.review || 0) > 0) && (
                      <Bar dataKey="review" fill="#f59e0b" name="Требует проверки" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Export button */}
          {stats && (
            <div className="pt-4 flex justify-end">
              <Button 
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                disabled={exporting || loading}
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Экспорт...' : 'Экспортировать отчёт (CSV)'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}