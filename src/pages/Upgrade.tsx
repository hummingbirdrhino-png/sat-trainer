import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, Lock, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';

const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL as string | undefined;

export default function Upgrade() {
  const { isPro, unlockProDemo } = useStore();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>Unlock SAT Trainer Pro</h1>
        <p className="mx-auto mt-3 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
          Full question-bank access, mock tests, focused drills, weak-spot review, and bookmarks.
        </p>
      </div>

      <div className="rounded-2xl border p-8" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(96,165,250,.45)' }}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-blue-400">Early access lifetime</div>
            <div className="mt-2 text-5xl font-black">$19</div>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>One payment. No subscription.</p>
          </div>
          <div className="space-y-3 text-sm">
            {['596 clean SAT Reading & Writing questions', 'Official answer keys and explanations', 'Timed mocks and adaptive practice', 'Weak-spot and missed-question review'].map((item) => (
              <div key={item} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> {item}</div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {checkoutUrl ? (
            <a href={checkoutUrl} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-4 font-bold text-white transition hover:bg-blue-400">
              <CreditCard className="h-5 w-5" /> Continue to checkout
            </a>
          ) : (
            <button onClick={unlockProDemo} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-4 font-bold text-white transition hover:bg-blue-400">
              <CreditCard className="h-5 w-5" /> Enable Pro demo
            </button>
          )}
          <Link to="/app" className="flex items-center justify-center rounded-xl border px-5 py-4 font-bold transition hover:bg-white/5" style={{ borderColor: 'rgba(148,163,184,.25)' }}>
            Back to app
          </Link>
        </div>

        {!checkoutUrl && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Payment link not connected yet. Add a Stripe or Lemon Squeezy checkout URL as <code>VITE_CHECKOUT_URL</code>. For now, this button enables Pro locally so you can test the funnel.
          </p>
        )}

        {isPro && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Pro is active on this browser.</p>}
      </div>
    </div>
  );
}
