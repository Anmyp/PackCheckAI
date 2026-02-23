import { useState, useEffect } from 'react';
import { LoginScreen } from './components/figma/LoginScreen';
import { ProfileScreen } from './components/figma/ProfileScreen';
import { AnnouncementsListScreen } from './components/figma/AnnouncementsListScreen';
import { EditAIDecisionScreen } from './components/figma/EditAIDecisionScreen';
import { AddCommentScreen } from './components/figma/AddCommentScreen';
import { ViewCommentsScreen } from './components/figma/ViewCommentsScreen';
import { StatisticsScreen } from './components/figma/StatisticsScreen';
import { PrintReportScreen } from './components/figma/PrintReportScreen';
import { UserManagementScreen } from './components/figma/UserManagementScreen';
import { api } from './lib/api';

type Screen = 
  | 'login'
  | 'profile'
  | 'announcements'
  | 'editAI'
  | 'addComment'
  | 'viewComments'
  | 'statistics'
  | 'printReport'
  | 'users';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'moderator' | 'admin'>('moderator');
  const [userName, setUserName] = useState<string>('');

  // Проверка сохранённой сессии при загрузке
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role') as 'moderator' | 'admin' | null;
    const name = localStorage.getItem('user_name') || '';
    
    if (token && role) {
      // Проверяем, что токен ещё действителен (упрощённая проверка)
      setIsLoggedIn(true);
      setUserRole(role);
      setUserName(name);
      setCurrentScreen('announcements');
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      // 1. Авторизация и получение токена + данных пользователя
      const authResponse = await api.login({ username, password });
      
      if (!authResponse.access_token) {
        throw new Error('Сервер не вернул токен доступа');
      }

      // 2. Сохраняем токен и данные пользователя
      localStorage.setItem('access_token', authResponse.access_token);
      
      // Если сервер вернул данные пользователя в ответе на /auth/login
      if (authResponse.user) {
        localStorage.setItem('user_role', authResponse.user.role);
        localStorage.setItem('user_name', authResponse.user.name);
        setUserRole(authResponse.user.role as 'moderator' | 'admin');
        setUserName(authResponse.user.name);
      } else {
        // Иначе запрашиваем профиль отдельно
        const profile = await api.getProfile();
        localStorage.setItem('user_role', profile.role);
        localStorage.setItem('user_name', profile.name);
        setUserRole(profile.role as 'moderator' | 'admin');
        setUserName(profile.name);
      }
      
      // 3. Устанавливаем состояние авторизации
      setIsLoggedIn(true);
      setCurrentScreen('announcements');
      
    } catch (error) {
      // Очищаем данные при ошибке
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      
      alert('Ошибка входа: ' + (error as Error).message);
    }
  };

  const handleLogout = () => {
    // Очищаем данные сессии
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    
    setIsLoggedIn(false);
    setCurrentScreen('login');
    setSelectedAnnouncementId(null);
    setUserRole('moderator');
    setUserName('');
  };

  // 🔒 Защита: если модератор как-то оказался на экране 'users' — перенаправляем
  useEffect(() => {
    if (isLoggedIn && userRole === 'moderator' && currentScreen === 'users') {
      setCurrentScreen('announcements');
    }
  }, [isLoggedIn, userRole, currentScreen]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-blue-600 font-bold text-xl">Система верификации</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentScreen('announcements');
                    setSelectedAnnouncementId(null);
                  }}
                  className={`px-3 py-1 ${
                    currentScreen === 'announcements'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Объявления
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen('statistics');
                    setSelectedAnnouncementId(null);
                  }}
                  className={`px-3 py-1 ${
                    currentScreen === 'statistics'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Статистика
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen('printReport');
                    setSelectedAnnouncementId(null);
                  }}
                  className={`px-3 py-1 ${
                    currentScreen === 'printReport'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Отчёты
                </button>
                {/* 🔒 Вкладка "Пользователи" ТОЛЬКО для админа */}
                {userRole === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentScreen('users');
                      setSelectedAnnouncementId(null);
                    }}
                    className={`px-3 py-1 ${
                      currentScreen === 'users'
                        ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Пользователи
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentScreen('profile');
                    setSelectedAnnouncementId(null);
                  }}
                  className={`px-3 py-1 ${
                    currentScreen === 'profile'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Профиль
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{userName}</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  userRole === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {userRole === 'admin' ? 'Администратор' : 'Модератор'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentScreen === 'profile' && <ProfileScreen />}
        {currentScreen === 'announcements' && (
          <AnnouncementsListScreen
            onEditDecision={(id) => {
              setSelectedAnnouncementId(id);
              setCurrentScreen('editAI');
            }}
            onViewComments={(id) => {
              setSelectedAnnouncementId(id);
              setCurrentScreen('viewComments');
            }}
          />
        )}
        {currentScreen === 'editAI' && selectedAnnouncementId && (
          <EditAIDecisionScreen 
            announcementId={selectedAnnouncementId}
            onBack={() => {
              setSelectedAnnouncementId(null);
              setCurrentScreen('announcements');
            }} 
          />
        )}
        {currentScreen === 'addComment' && selectedAnnouncementId && (
          <AddCommentScreen 
            announcementId={selectedAnnouncementId}
            onBack={() => setCurrentScreen('viewComments')} 
          />
        )}
        {currentScreen === 'viewComments' && selectedAnnouncementId && (
          <ViewCommentsScreen
            announcementId={selectedAnnouncementId}
            onAddComment={(id) => {
              setSelectedAnnouncementId(id);
              setCurrentScreen('addComment');
            }}
            onBack={() => {
              setSelectedAnnouncementId(null);
              setCurrentScreen('announcements');
            }}
          />
        )}
        {currentScreen === 'statistics' && <StatisticsScreen />}
        {currentScreen === 'printReport' && <PrintReportScreen />}
        {/* 🔒 Экран управления пользователями ДОСТУПЕН ТОЛЬКО АДМИНУ */}
        {currentScreen === 'users' && userRole === 'admin' && <UserManagementScreen />}
        {currentScreen === 'users' && userRole === 'moderator' && (
          <div className="text-center py-12 text-gray-500">
            У вас нет прав для доступа к управлению пользователями
          </div>
        )}
      </div>
    </div>
  );
}