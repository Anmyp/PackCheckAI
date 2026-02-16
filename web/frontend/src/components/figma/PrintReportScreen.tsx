import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Eye, Printer, Download } from 'lucide-react';
import { api } from '../../lib/api';

export function PrintReportScreen() {
  const [dateFrom, setDateFrom] = useState('2025-10-01');
  const [dateTo, setDateTo] = useState('2025-10-26');
  const [marketplace, setMarketplace] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError('Дата "с" не может быть позже даты "по"');
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
      setPreviewUrl(url);
    } catch (error) {
      console.error('Ошибка генерации отчёта:', error);
      setError('Не удалось сгенерировать отчёт');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!previewUrl) {
      await handlePreview();
      return;
    }
    
    const printWindow = window.open(previewUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleExport = async () => {
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError('Дата "с" не может быть позже даты "по"');
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
      a.download = `report_${dateFrom}_to_${dateTo}.csv`;
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
    <div className="max-w-3xl">
      <h2 className="mb-6">Печать отчета</h2>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-6">
          {/* Period selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportDateFrom">Период с</Label>
              <Input
                id="reportDateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-2 border-gray-300"
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label htmlFor="reportDateTo">Период по</Label>
              <Input
                id="reportDateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-2 border-gray-300"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Marketplace selector */}
          <div>
            <Label htmlFor="marketplace">Маркетплейс</Label>
            <Select 
              value={marketplace} 
              onValueChange={(value) => {
                setMarketplace(value);
                if (error) setError(null);
              }}
              disabled={isGenerating}
            >
              <SelectTrigger className="mt-2 border-gray-300">
                <SelectValue placeholder="Выберите маркетплейс" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="wildberries">Wildberries</SelectItem>
                <SelectItem value="ozon">Ozon</SelectItem>
                <SelectItem value="yandex">Яндекс.Маркет</SelectItem>
                <SelectItem value="aliexpress">AliExpress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="border-gray-300"
              disabled={isGenerating}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isGenerating ? 'Генерация...' : 'Предварительный просмотр'}
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
            <Button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт в CSV
            </Button>
          </div>

          {/* Report preview */}
          {previewUrl ? (
            <div className="mt-6 border-2 border-gray-300 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Предварительный просмотр</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                  className="border-gray-300"
                >
                  Закрыть
                </Button>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-96 border border-gray-300 rounded"
                title="Предварительный просмотр отчёта"
              />
            </div>
          ) : (
            <div className="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📄</div>
                <p>Предварительный просмотр отчета появится здесь</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}