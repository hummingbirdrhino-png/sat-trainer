import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { BookOpen, LayoutDashboard, Bookmark, Settings, Trophy, LogOut } from 'lucide-react';

export default function TopBar() {
  const location = useLocation();
  const { displayName, bookmarks, dailyGoals, settings, logout } = useStore();

  const today = new Date().toISOString().split('T')[0];
  const todayGoal = dailyGoals.find((g) => g.date === today);
  const goalProgress = todayGoal && todayGoal.target > 0
    ? Math.min(100, (todayGoal.completed / todayGoal.target) * 100)
    : 0;

  const navItems = [
    { path: '/app', label: 'Practice', icon: BookOpen },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl transition-all duration-300"
      style={{
        backgroundColor: 'var(--bg-glass)',
        borderColor: 'rgba(148, 163, 184, 0.1)',
      }}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" style={{ color: 'var(--accent-blue)' }} />
          <span className="text-lg font-bold tracking-wide" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            SAT TRAINER
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Daily Goal Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <Trophy className="h-4 w-4" style={{ color: 'var(--accent-amber)' }} />
            <div className="h-2 w-20 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${goalProgress}%`,
                  backgroundColor: goalProgress >= 100 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                }}
              />
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {todayGoal?.completed ?? 0}/{settings.dailyGoalTarget}
            </span>
          </div>

          {/* Bookmarks */}
          <Link
            to="/app"
            className="relative rounded-lg p-2 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Bookmark className="h-5 w-5" />
            {bookmarks.length > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
              >
                {bookmarks.length}
              </span>
            )}
          </Link>

          {/* User */}
          <div className="hidden items-center gap-2 sm:flex">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
