import { NavLink } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../app/providers/SidebarProvider';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  User as UserIcon,
  TrendingUp,
  PenTool,
  BarChart,
  Sparkles,
  Newspaper,
  Package,
  GraduationCap,
  X
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuth();
  const { isMobileOpen, closeSidebar } = useSidebar();

  if (!user) return null;

  const facultyLinks = [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/growth-plan', label: 'Growth Plan', icon: TrendingUp },
    { to: '/faculty/practice', label: 'Practice', icon: CheckSquare },
    { to: '/faculty/programs', label: 'Programs', icon: BookOpen },
    { to: '/faculty/profile', label: 'Profile', icon: UserIcon },
    { to: '/faculty/resources', label: 'Resources', icon: Newspaper },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/faculty', label: 'Faculty Analytics', icon: BarChart },
    { to: '/admin/programs', label: 'Programs', icon: BookOpen },
    { to: '/admin/question-packs', label: 'Question Packs', icon: Package },
    { to: '/admin/test-builder', label: 'Test Builder', icon: PenTool },
    { to: '/admin/ai-insights', label: 'AI Insights', icon: Sparkles },
    { to: '/admin/resources', label: 'Resources', icon: Newspaper },
  ];

  const links = user.role === 'admin' ? adminLinks : facultyLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white border-r border-slate-100 selection:bg-blue-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex h-16 lg:h-20 items-center justify-between px-4 lg:px-6 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 uppercase">FSD.Portal</span>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
              <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase opacity-80">{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

