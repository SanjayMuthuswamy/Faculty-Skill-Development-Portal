import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useSidebar } from '../../app/providers/SidebarProvider';
import { facultyApi, resolveBackendAssetUrl } from '../../lib/api/faculty';
import { Button } from '../ui/Button';

export function Topbar() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const isFaculty = user?.role === 'faculty';

  const { data: profile } = useQuery({
    queryKey: ['faculty-profile', 'me'],
    queryFn: facultyApi.getMe,
    enabled: !!user && isFaculty,
    staleTime: 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = profile?.user?.name || user?.name || 'User';
  const avatarUrl = resolveBackendAssetUrl(profile?.profile_image_url);

  return (
    <div className="flex h-16 lg:h-20 items-center justify-between border-b border-slate-100 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="hidden md:block">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Welcome, {displayName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs lg:text-sm text-slate-500">
              {user?.role === 'admin' ? 'Admin Dashboard' : 'Faculty Portal'}
            </p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                user?.role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {user?.role}
            </span>
            <span className="text-[10px] text-slate-400">{user?.email}</span>
          </div>
        </div>

        <h1 className="md:hidden text-lg font-bold text-slate-900">
          {user?.role === 'admin' ? 'Admin' : 'Portal'}
        </h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </div>
  );
}
