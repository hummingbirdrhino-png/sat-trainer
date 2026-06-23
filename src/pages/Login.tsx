import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, LogIn, UserPlus } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface LoginProps {
  defaultMode?: 'login' | 'register';
}

export default function Login({ defaultMode = 'login' }: LoginProps) {
  const { userId, login, register } = useStore();
  const [isRegistering, setIsRegistering] = useState(defaultMode === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (userId) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password || (isRegistering && !trimmedName)) {
      setError('Please fill out all required fields.');
      return;
    }

    const result = isRegistering
      ? register(trimmedName, trimmedEmail, password)
      : login(trimmedEmail, password);

    if (!result.ok) {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.18)' }}
      >
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.14)', color: 'var(--accent-blue)' }}
          >
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            {isRegistering ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isRegistering
              ? 'Save your SAT practice progress on this device.'
              : 'Log in to continue your SAT training.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border px-4 py-3 outline-none transition focus:border-blue-500"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'rgba(148, 163, 184, 0.25)', color: 'var(--text-primary)' }}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none transition focus:border-blue-500"
              style={{ backgroundColor: 'var(--bg-base)', borderColor: 'rgba(148, 163, 184, 0.25)', color: 'var(--text-primary)' }}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none transition focus:border-blue-500"
              style={{ backgroundColor: 'var(--bg-base)', borderColor: 'rgba(148, 163, 184, 0.25)', color: 'var(--text-primary)' }}
              placeholder="Password"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-blue)' }}
          >
            {isRegistering ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            {isRegistering ? 'Create account' : 'Log in'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegistering((value) => !value);
            setError('');
          }}
          className="mt-6 w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          {isRegistering ? 'Already have an account? Log in' : 'Need an account? Create one'}
        </button>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Demo login stores accounts and progress in this browser&apos;s local storage. Connect a backend later for real multi-device auth.
        </p>
      </div>
    </div>
  );
}
