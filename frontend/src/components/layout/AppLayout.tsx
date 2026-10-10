import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Award, 
  LayoutDashboard, 
  PlusCircle, 
  ShieldCheck, 
  History, 
  Settings, 
  LogOut,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Issue Batch', path: '/jobs/new', icon: PlusCircle },
    { label: 'Certificates', path: '/certificates', icon: Award },
    { label: 'Audit Trail', path: '/audit', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/dashboard')) return 'Overview & Analytics';
    if (p.startsWith('/jobs/new')) return 'New Certificate Batch';
    if (p.startsWith('/jobs/')) return 'Batch Dispatch & Recipients';
    if (p.startsWith('/certificates')) return 'Credential Registry';
    if (p.startsWith('/audit')) return 'Security & Audit Log';
    if (p.startsWith('/settings')) return 'Workspace Settings';
    return 'CertiFlow';
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#17191C] flex">
      {/* Sidebar - Steep Warm Editorial Navigation */}
      <aside className="w-64 border-r border-[#ECECEC] flex flex-col justify-between bg-[#FAFAFB] shrink-0 select-none">
        <div>
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-[#ECECEC] flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#17191C] text-[#FFFFFF] rounded-full flex items-center justify-center font-bold text-xs tracking-tight shadow-sm">
                CF
              </div>
              <span className="font-serif text-lg tracking-tight text-[#17191C]">CertiFlow</span>
            </Link>
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 bg-[#F2F2F3] text-[#777B86] rounded-full border border-[#ECECEC]">
              v2.4
            </span>
          </div>

          {/* Org Workspace Card */}
          <div className="p-4 mx-4 my-4 bg-[#F2F2F3] rounded-[20px] border border-transparent">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#979799]">
              Workspace
            </div>
            <div className="text-sm font-medium truncate text-[#17191C] mt-0.5">
              {organization?.name || 'Primary Organization'}
            </div>
            <div className="text-[11px] text-[#777B86] truncate mt-0.5 font-mono">
              {user?.email}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#17191C] text-[#FFFFFF] font-medium shadow-sm'
                      : 'text-[#777B86] hover:text-[#17191C] hover:bg-[#F2F2F3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FBE1D1]' : 'text-[#777B86]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ArrowRight className="w-3 h-3 text-[#FBE1D1]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#ECECEC] space-y-1 bg-[#FAFAFB]">
          <Link
            to="/verify"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2 text-xs text-[#777B86] hover:text-[#17191C] hover:bg-[#F2F2F3] rounded-full transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#5D2A1A]" />
              <span>Public Verifier</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#777B86] hover:text-[#D32F2F] hover:bg-[#F2F2F3] rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Full Width Paper Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-[#ECECEC] px-6 md:px-10 flex items-center justify-between bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl font-normal text-[#17191C] tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/jobs/new"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] rounded-full transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Issue Certificates</span>
            </Link>
          </div>
        </header>

        {/* Full-width responsive workspace */}
        <main className="flex-1 p-6 md:p-10 w-full bg-[#FFFFFF]">
          {children}
        </main>
      </div>
    </div>
  );
};

