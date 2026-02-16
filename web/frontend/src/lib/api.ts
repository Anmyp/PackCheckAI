// src/lib/api.ts
const API_BASE_URL = 'http://localhost:8000';

export const api = {
  // Аутентификация
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Неверный логин или пароль');
    return response.json();
  },

  // Профиль
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/profile`);
    if (!response.ok) throw new Error('Ошибка загрузки профиля');
    return response.json();
  },

  // Управление пользователями (только админ)
  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error('Ошибка загрузки пользователей');
    return response.json();
  },

  createUser: async (userData: { full_name: string; email: string; role: string; login: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Ошибка создания пользователя');
    return response.json();
  },

  updateUser: async (userId: number, userData: { full_name: string; email: string; role: string; is_active: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Ошибка обновления пользователя');
    return response.json();
  },

  deleteUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Ошибка удаления пользователя');
    return response.json();
  },

  // Объявления
  getAnnouncements: async () => {
    const response = await fetch(`${API_BASE_URL}/announcements/`);
    if (!response.ok) throw new Error('Ошибка загрузки объявлений');
    return response.json();
  },

  updateAnnouncementStatus: async (id: string, status: 'normal' | 'damaged', comment?: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment }),
    });
    if (!response.ok) throw new Error('Ошибка обновления статуса');
    return response.json();
  },

  // Комментарии
  getComments: async (announcementId: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}/comments`);
    if (!response.ok) throw new Error('Ошибка загрузки комментариев');
    return response.json();
  },

  addComment: async (announcementId: string, text: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Ошибка добавления комментария');
    return response.json();
  },

  // Статистика
  getStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/statistics/`);
    if (!response.ok) throw new Error('Ошибка загрузки статистики');
    return response.json();
  },

  // Отчёты
  generateReport: async (params: { dateFrom: string; dateTo: string; marketplace?: string }) => {
    const query = new URLSearchParams();
    query.append('date_from', params.dateFrom);
    query.append('date_to', params.dateTo);
    if (params.marketplace) query.append('marketplace', params.marketplace);

    const response = await fetch(`${API_BASE_URL}/reports/generate?${query}`);
    if (!response.ok) throw new Error('Ошибка генерации отчёта');
    return response.blob();
  },
};