import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';
import { BarChart3, Grid2X2, Link2, LogOut, Menu, Plus, QrCode, ShieldCheck, Upload, X } from 'lucide-react';

export const Shell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch { /* local session is cleared by the server or expires naturally */ }
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Grid2X2 },
    { label: 'Links & QR', path: '/links', icon: Link2 },
    { label: 'Create link', path: '/create-link', icon: Plus },
    { label: 'Create QR code', path: '/qr-codes', icon: QrCode },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const mobileNavLinkClass = (path: string) => clsx(
    'flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold',
    location.pathname.startsWith(path) ? 'bg-primary text-cream' : 'text-slate-200 hover:bg-navy-800',
  );

  const navLinkClass = (path: string) => clsx(
    'flex min-h-12 items-center gap-3 rounded-[10px] px-4 text-sm font-semibold transition-colors',
    location.pathname.startsWith(path) ? 'bg-primary text-cream' : 'text-slate-300 hover:bg-navy-800 hover:text-cream',
  );

  return (
    <div className="min-h-screen bg-app text-textPrimary">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[216px] flex-col bg-navy-900 px-4 py-7 text-cream lg:flex">
        <Link to="/dashboard" className="mb-12 px-3 text-[24px] font-extrabold tracking-[-0.06em]" aria-label="LinkPulse home">
          Link<span className="text-accent">Pulse</span>
        </Link>
        <p className="mb-4 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-300">Workspace</p>
        <nav className="flex-1 space-y-2">
          {navItems.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className={navLinkClass(path)}>
              <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          <Link to="/import" className={navLinkClass('/import')}><Upload className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /><span>Import CSV</span></Link>
          {user?.role === 'ADMIN' && <Link to="/admin" className={clsx(navLinkClass('/admin'), 'mt-5 border border-accent/30 text-accent')}><ShieldCheck className="h-5 w-5" aria-hidden="true" /><span>Super admin</span></Link>}
        </nav>
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-xs font-bold text-ink">{user?.name?.slice(0, 2).toUpperCase() || 'LP'}</div>
           <div className="min-w-0"><p className="truncate text-xs font-bold">{user?.name || 'LinkPulse member'}</p><p className="text-[11px] text-slate-300">{user?.role === 'ADMIN' ? 'Super admin' : 'Workspace member'}</p></div>
        </div>
        <button onClick={handleLogout} className="mt-5 flex items-center gap-3 px-3 text-xs font-semibold text-slate-300 hover:text-cream"><LogOut className="h-4 w-4" aria-hidden="true" /> Log out</button>
      </aside>

      <div className="min-h-screen lg:pl-[216px]">
        <div className="flex items-center justify-between border-b border-line bg-navy-900 px-5 py-3 text-cream lg:hidden">
          <Link to="/dashboard" className="text-xl font-extrabold tracking-[-0.06em]">Link<span className="text-accent">Pulse</span></Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen(open => !open)} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-100 hover:bg-navy-800" aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-navigation" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}>
              {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}<span className="hidden min-[360px]:inline">Menu</span>
            </button>
            <button onClick={handleLogout} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-navy-800" aria-label="Log out"><LogOut className="h-5 w-5" aria-hidden="true" /></button>
          </div>
        </div>
        {mobileMenuOpen && <nav id="mobile-workspace-navigation" aria-label="Workspace navigation" className="space-y-1 border-b border-white/10 bg-navy-900 px-4 pb-4 pt-2 text-cream lg:hidden">
          {[...navItems, { label: 'Import CSV', path: '/import', icon: Upload }].map(({ label, path, icon: Icon }) => <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(path)}><Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span></Link>)}
          {user?.role === 'ADMIN' && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass('/admin')}><ShieldCheck className="h-5 w-5" aria-hidden="true" /><span>Super admin</span></Link>}
          <div className="mt-3 border-t border-white/10 px-4 pt-3 text-xs text-slate-300">Signed in as <span className="font-semibold text-cream">{user?.name || user?.email}</span></div>
        </nav>}
        <main className="mx-auto min-h-screen w-full max-w-[1224px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
};
