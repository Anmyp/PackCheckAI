import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { api } from '../../lib/api';

interface User {
  id: number;
  login: string;
  full_name: string;
  email: string;
  role: 'moderator' | 'admin';
  is_active: boolean;
  created_at: string;
}

export function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Форма
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'moderator',
    login: '',
    password: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      alert('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.createUser(formData);
      setShowForm(false);
      setFormData({ full_name: '', email: '', role: 'moderator', login: '', password: '' });
      loadUsers();
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      alert('Не удалось создать пользователя');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      await api.updateUser(editingUser.id, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role as any,
        is_active: editingUser.is_active
      });
      setEditingUser(null);
      setShowForm(false);
      loadUsers();
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      alert('Не удалось обновить пользователя');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      alert('Не удалось удалить пользователя');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      login: '',
      password: ''
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ full_name: '', email: '', role: 'moderator', login: '', password: '' });
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Управление пользователями</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить пользователя
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">
            {editingUser ? 'Редактирование пользователя' : 'Создание пользователя'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="full_name">Полное имя</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Введите полное имя"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Введите email"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Роль</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!editingUser && (
              <>
                <div>
                  <Label htmlFor="login">Логин</Label>
                  <Input
                    id="login"
                    value={formData.login}
                    onChange={(e) => setFormData({...formData, login: e.target.value})}
                    placeholder="Введите логин"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Введите пароль"
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingUser ? 'Сохранить' : 'Создать'}
            </Button>
            <Button
              onClick={cancelForm}
              variant="outline"
              className="border-gray-300"
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Загрузка пользователей...</div>
      ) : (
        <div className="bg-white border border-gray-300 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="border-b border-gray-300">Имя</TableHead>
                <TableHead className="border-b border-gray-300">Логин</TableHead>
                <TableHead className="border-b border-gray-300">Email</TableHead>
                <TableHead className="border-b border-gray-300">Роль</TableHead>
                <TableHead className="border-b border-gray-300">Статус</TableHead>
                <TableHead className="border-b border-gray-300">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="border-b border-gray-200">{user.full_name}</TableCell>
                  <TableCell className="border-b border-gray-200">{user.login}</TableCell>
                  <TableCell className="border-b border-gray-200">{user.email}</TableCell>
                  <TableCell className="border-b border-gray-200">
                    <span className={`px-2 py-1 rounded ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? 'Админ' : 'Модератор'}
                    </span>
                  </TableCell>
                  <TableCell className="border-b border-gray-200">
                    <span className={`px-2 py-1 rounded ${
                      user.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </TableCell>
                  <TableCell className="border-b border-gray-200">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300"
                        onClick={() => startEdit(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}