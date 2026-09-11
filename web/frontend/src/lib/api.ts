const API_BASE_URL = 'http://localhost:8000';

type AnnouncementStatus = 'normal' | 'damaged';

const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const handleUnauthorized = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
};

export const api = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Неверный логин или пароль');
      }
      throw new Error('Ошибка авторизации');
    }
    
    return await response.json();
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка загрузки профиля');
    return await response.json();
  },

  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (response.status === 403) {
      throw new Error('У вас нет прав для просмотра пользователей');
    }
    
    if (!response.ok) throw new Error('Ошибка загрузки пользователей');
    return await response.json();
  },

  createUser: async (userData: { full_name: string; email: string; role: string; login: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (response.status === 403) {
      throw new Error('У вас нет прав для создания пользователей');
    }
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const detail = errorBody?.detail || errorBody?.message || 'Ошибка создания пользователя';
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new Error(message);
    }
    return await response.json();
  },

  updateUser: async (userId: number, userData: { full_name: string; email: string; role: string; is_active: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (response.status === 403) {
      throw new Error('У вас нет прав для редактирования пользователей');
    }
    
    if (!response.ok) throw new Error('Ошибка обновления пользователя');
    return await response.json();
  },

  deleteUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (response.status === 403) {
      throw new Error('У вас нет прав для удаления пользователей');
    }
    
    if (!response.ok) throw new Error('Ошибка удаления пользователя');
    return await response.json();
  },

  getAnnouncements: async () => {
    const response = await fetch(`${API_BASE_URL}/announcements/`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка загрузки объявлений');
    return await response.json();
  },

getAnnouncement: async (announcementId: string) => {
  const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}`, {
    headers: getHeaders(),
  });
  
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
  }
  
  if (!response.ok) throw new Error('Ошибка загрузки данных объявления');
  return await response.json();
},

  updateAnnouncementStatus: async (id: string, status: AnnouncementStatus, comment?: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, comment }),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка обновления статуса');
    return await response.json();
  },

  deleteAnnouncement: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }

    if (!response.ok) throw new Error('Ошибка удаления объявления');
    return await response.json();
  },

  getComments: async (announcementId: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}/comments`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка загрузки комментариев');
    return await response.json();
  },

  addComment: async (announcementId: string, text: string) => {
    const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка добавления комментария');
    return await response.json();
  },

  getStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/statistics/`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка загрузки статистики');
    return await response.json();
  },

updateProfile: async (userData: { name: string; email: string }) => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  });
  
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
  }
  
  if (!response.ok) throw new Error('Ошибка обновления профиля');
  return await response.json();
},

  generateReport: async (params: { dateFrom: string; dateTo: string; marketplace?: string }) => {
    const query = new URLSearchParams();
    query.append('date_from', params.dateFrom);
    query.append('date_to', params.dateTo);
    if (params.marketplace && params.marketplace !== 'all') {
      query.append('marketplace', params.marketplace);
    }

    const response = await fetch(`${API_BASE_URL}/reports/generate?${query}`, {
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }
    
    if (!response.ok) throw new Error('Ошибка генерации отчёта');
    
    return await response.blob();
  },
};