import { useAuth } from '../../app/providers/AuthProvider';
import { useSidebar } from '../../app/providers/SidebarProvider';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function Topbar() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-16 lg:h-20 items-center justify-between border-b border-slate-100 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu - Mobile Only */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="hidden md:block">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
            Welcome, {user?.name.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs lg:text-sm text-slate-500">
              {user?.role === 'admin' ? 'Admin Dashboard' : 'Faculty Portal'}
            </p>
            {/* Role + email badge — critical for identifying session identity */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${user?.role === 'admin'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
              }`}>
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
        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600" />
        </button>

        {/* Logout Button */}
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
