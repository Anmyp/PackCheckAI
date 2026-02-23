import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Eye, Printer, Download, Calendar } from 'lucide-react';
import { api } from '../../lib/api';

export function PrintReportScreen() {
  // Минимальная и максимальная допустимые даты
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
  
  const [marketplace, setMarketplace] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    marketplace: ''
  });

  // Парсинг CSV с разделителем ";"
  const parseCSV = (csvText: string): string[][] => {
    if (!csvText.trim()) return [];
    
    const rows = csvText.trim().split('\n');
    return rows.map(row => {
      return row
        .split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(cell => cell.replace(/^"|"$/g, ''));
    });
  };

  const validateDates = (from: string, to: string): string | null => {
    if (from < MIN_DATE || to < MIN_DATE) {
      return `Дата не может быть раньше ${MIN_DATE}`;
    }
    
    if (from > MAX_DATE || to > MAX_DATE) {
      return `Дата не может быть позже ${MAX_DATE}`;
    }
    
    if (new Date(from) > new Date(to)) {
      return 'Дата "с" не может быть позже даты "по"';
    }
    
    return null;
  };

  const handlePreview = async () => {
    const validationError = validateDates(dateFrom, dateTo);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLoadingPreview(true);
    
    try {
      const blob = await api.generateReport({
        dateFrom,
        dateTo,
        marketplace: marketplace || undefined,
      });
      
      const text = await blob.text();
      setPreviewData(parseCSV(text));
      
      // Сохраняем применённые фильтры для печати/экспорта
      setAppliedFilters({
        dateFrom,
        dateTo,
        marketplace: marketplace || 'all'
      });
    } catch (error) {
      console.error('Ошибка генерации отчёта:', error);
      setError('Не удалось сгенерировать отчёт. Проверьте даты и попробуйте снова.');
    } finally {
      setIsGenerating(false);
      setLoadingPreview(false);
    }
  };

  const handlePrint = async () => {
    if (!previewData) {
      await handlePreview();
      if (!previewData) return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const tableRows = previewData.slice(1).map((row, rowIndex) =>
        `<tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
          ${row.map((cell, cellIndex) => 
            `<td class="border border-gray-200 px-4 py-3 ${
              cellIndex === 2 
                ? (cell === 'normal' ? 'text-green-600 font-medium' : 
                   cell === 'damaged' ? 'text-red-600 font-medium' : 
                   cell === 'review' ? 'text-yellow-600 font-medium' : '')
                : ''
            }">${cell}</td>`
          ).join('')}
        </tr>`
      ).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Отчёт по верификации</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 20px; 
                color: #374151; 
                background: #f9fafb;
              }
              h1 { 
                color: #1e40af; 
                text-align: center; 
                margin-bottom: 10px; 
              }
              .header { 
                text-align: center; 
                color: #6b7280; 
                margin-bottom: 20px; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 16px; 
              }
              th, td { 
                border: 1px solid #d1d5db; 
                padding: 12px 10px; 
                text-align: left; 
              }
              th { 
                background-color: #f3f4f6; 
                font-weight: 600; 
                color: #4b5563; 
              }
              tr:hover { 
                background-color: #f9fafb; 
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0; 
                  background: white;
                }
                .header { 
                  margin-top: 0; 
                  padding-top: 0; 
                }
                table { 
                  page-break-inside: auto; 
                }
                tr { 
                  page-break-inside: avoid; 
                  page-break-after: auto; 
                }
              }
            </style>
          </head>
          <body>
            <h1>Отчёт по верификации</h1>
            <div class="header">
              <p>Период: ${appliedFilters.dateFrom || dateFrom} — ${appliedFilters.dateTo || dateTo}</p>
              <p>Маркетплейс: ${appliedFilters.marketplace === 'all' ? 'Все' : appliedFilters.marketplace || marketplace || 'Все'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  ${previewData[0].map(header => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = async () => {
    const validationError = validateDates(dateFrom, dateTo);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const blob = await api.generateReport({
        dateFrom,
        dateTo,
        marketplace: marketplace || undefined,
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      setError('Не удалось экспортировать отчёт');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Печать отчёта</h2>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="reportDateFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Период с
            </Label>
            <Input
              id="reportDateFrom"
              type="date"
              value={dateFrom}
              min={MIN_DATE}
              max={MAX_DATE}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isGenerating}
            />
          </div>
          <div>
            <Label htmlFor="reportDateTo" className="block text-sm font-medium text-gray-700 mb-1">
              Период по
            </Label>
            <Input
              id="reportDateTo"
              type="date"
              value={dateTo}
              min={MIN_DATE}
              max={MAX_DATE}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isGenerating}
            />
          </div>
          <div>
            <Label htmlFor="marketplace" className="block text-sm font-medium text-gray-700 mb-1">
              Маркетплейс
            </Label>
            <Select 
              value={marketplace} 
              onValueChange={(value) => {
                setMarketplace(value);
                if (error) setError(null);
              }}
              disabled={isGenerating}
            >
              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Выберите маркетплейс" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="aliexpress">AliExpress</SelectItem>
                <SelectItem value="wildberries">Wildberries</SelectItem>
                <SelectItem value="ozon">Ozon</SelectItem>
                <SelectItem value="yandex">Яндекс.Маркет</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handlePreview}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
              disabled={isGenerating}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isGenerating ? 'Генерация...' : 'Применить фильтры'}
            </Button>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!previewData || isGenerating}
          >
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!previewData || isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт в CSV
          </Button>
        </div>

        {/* Предварительный просмотр */}
        {previewData && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Предварительный просмотр</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Период: {appliedFilters.dateFrom || dateFrom} — {appliedFilters.dateTo || dateTo} • 
                  Маркетплейс: {appliedFilters.marketplace === 'all' ? 'Все' : appliedFilters.marketplace || 'Все'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewData(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Закрыть
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {previewData[0].map((header, idx) => (
                      <th 
                        key={idx} 
                        className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.slice(1).map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className={`hover:bg-gray-50 transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex}
                          className={`py-3 px-4 text-sm ${
                            cellIndex === 2 
                              ? (cell === 'normal' ? 'text-green-600 font-medium' : 
                                 cell === 'damaged' ? 'text-red-600 font-medium' : 
                                 cell === 'review' ? 'text-yellow-600 font-medium' : '')
                              : 'text-gray-900'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {!previewData && !loadingPreview && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Предварительный просмотр отчёта</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Укажите период и маркетплейс, затем нажмите «Применить фильтры», чтобы увидеть содержимое отчёта.
            </p>
          </div>
        )}

        {/* Загрузка */}
        {loadingPreview && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Генерация предварительного просмотра...</p>
          </div>
        )}
      </div>
    </div>
  );
}