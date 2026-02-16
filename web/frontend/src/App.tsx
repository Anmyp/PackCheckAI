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

  const handleLogin = async (username: string, password: string) => {
    try {
      await api.login({ username, password });
      const profile = await api.getProfile();
      setUserRole(profile.role as 'moderator' | 'admin');
      setIsLoggedIn(true);
      setCurrentScreen('announcements');
    } catch (error) {
      alert('Ошибка входа: ' + (error as Error).message);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('login');
    setSelectedAnnouncementId(null);
    setUserRole('moderator');
  };

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
              <h1 className="text-blue-600">Система верификации</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentScreen('announcements');
                    setSelectedAnnouncementId(null);
                  }}
                  className={`px-3 py-1 ${
                    currentScreen === 'announcements'
                      ? 'text-blue-600 border-b-2 border-blue-600'
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
                      ? 'text-blue-600 border-b-2 border-blue-600'
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
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Отчеты
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentScreen('users');
                      setSelectedAnnouncementId(null);
                    }}
                    className={`px-3 py-1 ${
                      currentScreen === 'users'
                        ? 'text-blue-600 border-b-2 border-blue-600'
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
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Профиль
                </button>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Выход
            </button>
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
            onBack={() => setCurrentScreen('announcements')} 
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
            onBack={() => setCurrentScreen('announcements')}
          />
        )}
        {currentScreen === 'statistics' && <StatisticsScreen />}
        {currentScreen === 'printReport' && <PrintReportScreen />}
        {currentScreen === 'users' && userRole === 'admin' && <UserManagementScreen />}
      </div>
    </div>
  );
}