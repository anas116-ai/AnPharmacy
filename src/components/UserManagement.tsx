import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, MoreVertical, Shield, XCircle, Trash2, RefreshCw, Search, CheckCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Select, SelectItem } from './ui/select';
import { getRoleBadgeColor, getRoleLabel, formatDate, cn } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface UserRecord {
  id: number;
  username: string;
  display_name: string;
  role: string;
  last_login: string | null;
  is_active: number;
}

export default function UserManagement() {
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMenu, setShowMenu] = useState<number | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('sales');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadUsers();
    const handleClickOutside = () => setShowMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.listUsers();
        if (result.success) {
          setUsers(result.users || []);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newDisplayName.trim() || !newUsername.trim() || !newPassword.trim()) {
      toast.error('All fields are required');
      return;
    }
    setIsAdding(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createUser({
          username: newUsername.trim(),
          password: newPassword,
          displayName: newDisplayName.trim(),
          role: newRole,
        });
        if (result.success) {
          setShowAddDialog(false);
          setNewDisplayName('');
          setNewUsername('');
          setNewPassword('');
          setNewRole('sales');
          loadUsers();
          toast.success('User created successfully');
        } else {
          toast.error(result.error || 'Failed to create user');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    if (user.role === 'admin') return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.toggleUserActive({ id: user.id, isActive: !user.is_active });
        loadUsers();
      }
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
    setShowMenu(null);
  };

  const handleDeleteUser = async (id: number) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteUser({ id });
        if (result.success) {
          loadUsers();
        }
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
    setShowConfirmDelete(null);
    setShowMenu(null);
  };

  const filteredUsers = users.filter(u =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'admin': return 'from-[#123F3D] to-[#14292E]';
      case 'sales': return 'from-[#123F3D] to-[#14292E]';
      case 'purchase_mgr': return 'from-[#123F3D] to-[#14292E]';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground dark:text-foreground">User Management</h2>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">{users.length} users · {users.filter(u => u.is_active).length} active</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          {t('users.add')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <label htmlFor="user-search" className="sr-only">Search users</label>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 dark:text-muted-foreground" />
        <Input
          id="user-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name or username..."
          className="pl-10 h-11 rounded-xl bg-muted/50 border-border focus:bg-background dark:bg-muted/60 dark:border-border dark:text-foreground dark:placeholder:text-muted-foreground/60 dark:focus:bg-slate-700"
        />
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-background dark:bg-muted/40 rounded-2xl border border-border dark:border-border p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-muted-foreground dark:text-muted-foreground/60 text-sm font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="bg-background dark:bg-muted/40 rounded-2xl border border-border dark:border-border shadow-sm p-4 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br shadow-sm',
                    getRoleGradient(user.role)
                  )}>
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground dark:text-foreground">{user.display_name}</span>
                      <Badge variant={user.is_active ? 'safe' : 'destructive'} size="sm">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge size="sm" className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
                      @{user.username}
                      {user.last_login && (
                        <span className="ml-2">· Last login: {formatDate(user.last_login)}</span>
                      )}
                    </p>
                  </div>
                </div>
                {user.role !== 'admin' && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === user.id ? null : user.id); }}
                      className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground dark:text-muted-foreground/60" />
                    </button>
                    {showMenu === user.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-background dark:bg-muted/40 rounded-xl border border-border dark:border-border shadow-lg dark:shadow-slate-900/50 z-10 py-1 animate-fade-in overflow-hidden">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 dark:hover:bg-muted flex items-center gap-2.5 transition-colors"
                        >
                          {user.is_active ? (
                            <><XCircle className="w-4 h-4 text-amber-500" /> Deactivate</>
                          ) : (
                            <><CheckCircle className="w-4 h-4 text-emerald-500" /> Activate</>
                          )}
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(user.id)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-destructive/10 dark:hover:bg-red-900/20 flex items-center gap-2.5 text-destructive dark:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete User
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              {t('users.add')}
            </DialogTitle>
            <DialogClose onClick={() => setShowAddDialog(false)} />
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="add-display-name" className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/70 mb-1.5">{t('users.displayName')}</label>
              <Input id="add-display-name" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="e.g., John Doe" className="input-focus" />
            </div>
            <div>
              <label htmlFor="add-username" className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/70 mb-1.5">{t('users.username')}</label>
              <Input id="add-username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g., johndoe" className="input-focus" />
            </div>
            <div>
              <label htmlFor="add-password" className="block text-sm font-medium text-foreground/80 dark:text-muted-foreground/70 mb-1.5">{t('users.password')}</label>
              <Input id="add-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="input-focus" />
            </div>
            <Select label={t('users.role')} value={newRole} onValueChange={setNewRole}>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="sales">Sales Representative</SelectItem>
              <SelectItem value="purchase_mgr">Purchase Manager</SelectItem>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddUser} disabled={isAdding}>
              {isAdding ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </span>
              ) : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDelete !== null} onOpenChange={(o) => !o && setShowConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogClose onClick={() => setShowConfirmDelete(null)} />
          </DialogHeader>
          <div className="bg-destructive/10 dark:bg-destructive/10 border border-red-100 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-destructive dark:text-red-300">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => showConfirmDelete && handleDeleteUser(showConfirmDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
