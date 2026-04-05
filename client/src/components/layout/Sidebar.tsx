import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../app/providers/SidebarProvider';
import { facultyApi, resolveBackendAssetUrl } from '../../lib/api/faculty';
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
  Bot,
  BookMarked,
  PieChart,
  UserPlus,
  X,
  ChevronDown,
  ClipboardList,
  Cpu,
  BarChart2,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuth();
  const { isMobileOpen, closeSidebar } = useSidebar();
  const location = useLocation();
  const isFaculty = user?.role === 'faculty';
  const [testsOpen, setTestsOpen] = useState(
    location.pathname.startsWith('/faculty/tests') || location.pathname.startsWith('/faculty/practice')
  );

  const { data: facultyProfile } = useQuery({
    queryKey: ['faculty-profile', 'me'],
    queryFn: facultyApi.getMe,
    enabled: !!user && isFaculty,
    staleTime: 60 * 1000,
  });

  if (!user) return null;

  const sidebarAvatar = resolveBackendAssetUrl(facultyProfile?.profile_image_url);

  const isTestsActive =
    location.pathname.startsWith('/faculty/tests') ||
    location.pathname.startsWith('/faculty/practice');

  const facultyLinks = [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/growth-plan', label: 'Growth Plan', icon: TrendingUp },
    // "Tests" is a collapsible group — rendered separately below
    { to: '/faculty/programs', label: 'Programs', icon: BookOpen },
    { to: '/faculty/courses', label: 'Courses', icon: BookMarked },
    { to: '/faculty/forum', label: 'Forum', icon: MessageSquare },
    { to: '/faculty/ai-coach', label: 'AI Coach', icon: Bot },
    { to: '/faculty/profile', label: 'Profile', icon: UserIcon },
    { to: '/faculty/resources', label: 'Resources', icon: Newspaper },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/faculty-accounts', label: 'Faculty Accounts', icon: UserPlus },
    { to: '/admin/faculty', label: 'Faculty Analytics', icon: BarChart },
    { to: '/admin/programs', label: 'Programs', icon: BookOpen },
    { to: '/admin/question-packs', label: 'Question Packs', icon: Package },
    { to: '/admin/test-builder', label: 'Test Builder', icon: PenTool },
    { to: '/admin/courses', label: 'Courses', icon: BookMarked },
    { to: '/admin/course-analytics', label: 'Course Analytics', icon: PieChart },
    { to: '/admin/queries', label: 'Faculty Queries', icon: HelpCircle },
    { to: '/admin/ai-insights', label: 'AI Question Gen', icon: Sparkles },
  ];

  const navItemCls = (active: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
      active
        ? 'bg-blue-50 text-blue-600 shadow-sm'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    );

  const iconCls = (active: boolean) =>
    cn(
      'h-5 w-5 transition-transform duration-200',
      active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
    );

  const renderLinks = (links: typeof adminLinks) =>
    links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        onClick={closeSidebar}
        className={({ isActive }) => navItemCls(isActive)}
      >
        {({ isActive }) => (
          <>
            <link.icon className={iconCls(isActive)} />
            {link.label}
          </>
        )}
      </NavLink>
    ));

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
        'fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white border-r border-slate-100 selection:bg-blue-50 transition-transform duration-300 ease-in-out lg:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex h-16 lg:h-20 items-center justify-between px-4 lg:px-6 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 uppercase">FSD.Portal</span>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {user.role === 'admin' ? (
            renderLinks(adminLinks)
          ) : (
            <>
              {/* Dashboard */}
              {renderLinks([facultyLinks[0]])}
              {/* Growth Plan */}
              {renderLinks([facultyLinks[1]])}

              {/* ── Tests collapsible group ── */}
              <button
                onClick={() => setTestsOpen(o => !o)}
                className={navItemCls(isTestsActive && !testsOpen)}
                style={{ width: '100%' }}
              >
                <CheckSquare className={iconCls(isTestsActive && !testsOpen)} />
                <span className="flex-1 text-left">Tests</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-300',
                    testsOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'
                  )}
                />
              </button>

              {/* Sub-items with smooth animation */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  testsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="ml-4 pl-3 border-l-2 border-slate-100 space-y-0.5 py-1">
                  {[
                    { to: '/faculty/tests', label: 'Official Tests', icon: ClipboardList },
                    { to: '/faculty/practice', label: 'AI Practice Tests', icon: Cpu },
                    { to: '/faculty/tests?tab=results', label: 'Results', icon: BarChart2 },
                  ].map(({ to, label, icon: Icon }) => {
                    const isActive2 =
                      label === 'AI Practice Tests'
                        ? location.pathname.startsWith('/faculty/practice')
                        : label === 'Official Tests'
                          ? location.pathname.startsWith('/faculty/tests') && !location.search.includes('results')
                          : location.pathname.startsWith('/faculty/tests') && location.search.includes('results');
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={closeSidebar}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                          isActive2
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Remaining faculty links (Programs, Courses, AI Coach, Profile, Resources) */}
              {renderLinks(facultyLinks.slice(2))}
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 overflow-hidden">
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
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
