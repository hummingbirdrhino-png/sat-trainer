import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Theme, FontFamily, FontSize } from '@/types';
import { cn } from '@/lib/utils';
import {
  Palette,
  Bell,
  Download,
  Trash2,
  AlertTriangle,
  Moon,
  Sun,
  Coffee,
  Contrast,
  Monitor,
} from 'lucide-react';

const themes: { id: Theme; label: string; icon: React.ComponentType<{ className?: string }>; preview: string }[] = [
  { id: 'dark', label: 'Dark Navy', icon: Moon, preview: '#0F172A' },
  { id: 'light', label: 'Light', icon: Sun, preview: '#FFFFFF' },
  { id: 'sepia', label: 'Sepia', icon: Coffee, preview: '#FAF0E6' },
  { id: 'high-contrast', label: 'High Contrast', icon: Contrast, preview: '#000000' },
  { id: 'pure-black', label: 'Pure Black', icon: Monitor, preview: '#0A0A0A' },
];

const fontFamilies: { id: FontFamily; label: string }[] = [
  { id: 'sans', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'dyslexic', label: 'OpenDyslexic' },
];

const fontSizes: { id: FontSize; label: string; size: string }[] = [
  { id: 'small', label: 'Small', size: '14px' },
  { id: 'medium', label: 'Medium', size: '16px' },
  { id: 'large', label: 'Large', size: '18px' },
];

export default function Settings() {
  const { settings, updateSettings, userAnswers, sessionSummaries, userSkills, bookmarks } = useStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'notifications' | 'data'>('appearance');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const tabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'data' as const, label: 'Data Export', icon: Download },
  ];

  const handleExportJSON = () => {
    const data = {
      userAnswers,
      sessionSummaries,
      userSkills,
      bookmarks,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sat-trainer-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['questionId', 'selectedAnswer', 'isCorrect', 'confidenceLevel', 'timeSpentSeconds', 'timestamp'];
    const rows = userAnswers.map((a) =>
      [a.questionId, a.selectedAnswer, a.isCorrect, a.confidenceLevel, a.timeSpentSeconds, a.timestamp].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sat-trainer-answers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    localStorage.removeItem('sat-trainer-storage');
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1
        className="mb-8 text-3xl font-bold"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        Settings
      </h1>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar */}
        <div className="w-full shrink-0 md:w-48">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Theme Selector */}
              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Theme
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({ theme: theme.id })}
                      className={cn(
                        'group rounded-xl border-2 p-3 text-center transition-all',
                        settings.theme === theme.id
                          ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                          : 'border-slate-700 hover:border-slate-500'
                      )}
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div
                        className="mx-auto mb-2 h-12 w-full rounded-lg border"
                        style={{
                          backgroundColor: theme.preview,
                          borderColor: theme.id === 'light' ? '#E2E8F0' : '#334155',
                        }}
                      />
                      <theme.icon
                        className={cn(
                          'mx-auto mb-1 h-4 w-4',
                          settings.theme === theme.id ? 'text-blue-400' : 'text-slate-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-xs font-medium',
                          settings.theme === theme.id ? 'text-blue-400' : 'text-slate-400'
                        )}
                      >
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Font Family
                </h3>
                <div className="flex gap-2">
                  {fontFamilies.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => updateSettings({ fontFamily: font.id })}
                      className={cn(
                        'rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                        settings.fontFamily === font.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      )}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Font Size
                </h3>
                <div className="flex gap-2">
                  {fontSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => updateSettings({ fontSize: size.id })}
                      className={cn(
                        'rounded-lg border-2 px-4 py-2 transition-all',
                        settings.fontSize === size.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 hover:border-slate-500'
                      )}
                    >
                      <span
                        className={cn(
                          'font-medium',
                          settings.fontSize === size.id ? 'text-blue-400' : 'text-slate-400'
                        )}
                        style={{ fontSize: size.size }}
                      >
                        {size.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Daily Goals
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Daily Goals</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track your daily practice targets</p>
                    </div>
                    <button
                      onClick={() => updateSettings({ dailyGoalTarget: settings.dailyGoalTarget > 0 ? 0 : 20 })}
                      className={cn(
                        'h-6 w-11 rounded-full transition-colors',
                        settings.dailyGoalTarget > 0 ? 'bg-blue-500' : 'bg-slate-700'
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded-full bg-white transition-transform',
                          settings.dailyGoalTarget > 0 ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {settings.dailyGoalTarget > 0 && (
                    <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                      <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Daily Target (questions)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={settings.dailyGoalTarget}
                        onChange={(e) => updateSettings({ dailyGoalTarget: parseInt(e.target.value) || 20 })}
                        className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Reminder Time
                </h3>
                <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                    className="rounded-lg border bg-transparent px-3 py-2 text-sm"
                    style={{ borderColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-primary)' }}
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Browser notifications will be sent at this time if your daily goal is incomplete.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>AI Explanations</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Show AI-powered explanations after answering</p>
                </div>
                <button
                  onClick={() => updateSettings({ aiExplanationsEnabled: !settings.aiExplanationsEnabled })}
                  className={cn(
                    'h-6 w-11 rounded-full transition-colors',
                    settings.aiExplanationsEnabled ? 'bg-blue-500' : 'bg-slate-700'
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded-full bg-white transition-transform',
                      settings.aiExplanationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Target SAT Score
                </label>
                <input
                  type="number"
                  min={200}
                  max={800}
                  step={10}
                  value={settings.targetSatScore}
                  onChange={(e) => updateSettings({ targetSatScore: parseInt(e.target.value) || 700 })}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                  style={{ borderColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Export Your Data
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportJSON}
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-white/5"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}
                  >
                    <Download className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Export as JSON</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Complete data including answers, skills, and settings</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-white/5"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}
                  >
                    <Download className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Export as CSV</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Answer history in spreadsheet format</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-rose-400">Danger Zone</h3>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-2 rounded-lg border border-rose-500/30 px-4 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All Data
                  </button>
                ) : (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-rose-400">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Are you sure?</span>
                    </div>
                    <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      This will permanently delete all your practice history, mastery scores, and bookmarks. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearData}
                        className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
                      >
                        Yes, Clear Everything
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="rounded-lg border px-4 py-2 text-sm"
                        style={{ borderColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
