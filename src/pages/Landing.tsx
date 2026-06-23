import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, LineChart, Lock, Sparkles, Target, Zap } from 'lucide-react';

const features = [
  { icon: Target, title: 'Adaptive practice', text: 'Questions adjust toward the skills you miss most.' },
  { icon: Clock, title: 'Timed SAT-style sessions', text: 'Build speed without guessing blindly.' },
  { icon: LineChart, title: 'Progress dashboard', text: 'Track mastery, weak spots, and predicted score.' },
  { icon: Sparkles, title: 'Official-style explanations', text: 'Review why the correct answer works after each question.' },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Try the trainer',
    features: ['25-question starter access', 'Basic adaptive practice', 'Local progress tracking'],
    cta: 'Start free',
    to: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    subtitle: 'Lifetime early-access price',
    features: ['Full 596-question bank', 'Mock tests + focused drills', 'Weak-spot review', 'Bookmarks and missed-question review'],
    cta: 'Unlock Pro',
    to: '/upgrade',
    highlighted: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <section className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm" style={{ borderColor: 'rgba(96,165,250,.35)', backgroundColor: 'rgba(59,130,246,.08)', color: '#93C5FD' }}>
            <Zap className="h-4 w-4" />
            SAT Reading & Writing practice that adapts to you
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight md:text-7xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Stop grinding random SAT questions. Practice the skills that move your score.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl" style={{ color: 'var(--text-secondary)' }}>
            A focused SAT Reading & Writing trainer with a clean question bank, timed practice, explanations, bookmarks, and weak-spot tracking.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="rounded-xl bg-blue-500 px-7 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400">
              Start practicing free
            </Link>
            <Link to="/login" className="rounded-xl border px-7 py-4 font-bold transition hover:bg-white/5" style={{ borderColor: 'rgba(148,163,184,.25)' }}>
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>Free starter access. Upgrade when you want the full bank.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-16 md:grid-cols-4">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148,163,184,.14)' }}>
            <feature.icon className="mb-4 h-7 w-7 text-blue-400" />
            <h3 className="mb-2 font-bold">{feature.title}</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24" id="pricing">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black md:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>Simple pricing</h2>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Launch price designed for students, not enterprise procurement.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.name} className="relative rounded-2xl border p-7" style={{ backgroundColor: plan.highlighted ? 'rgba(59,130,246,.10)' : 'var(--bg-surface)', borderColor: plan.highlighted ? 'rgba(96,165,250,.55)' : 'rgba(148,163,184,.14)' }}>
              {plan.highlighted && <div className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">Best value</div>}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-black">{plan.price}</span>
                {plan.name === 'Pro' && <span className="pb-2 text-sm" style={{ color: 'var(--text-muted)' }}>one-time</span>}
              </div>
              <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>{plan.subtitle}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((item) => (
                  <li key={item} className="flex gap-2 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> {item}</li>
                ))}
              </ul>
              <Link to={plan.to} className="mt-7 flex w-full justify-center rounded-xl px-5 py-3 font-bold transition" style={{ backgroundColor: plan.highlighted ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: plan.highlighted ? '#fff' : 'var(--text-primary)' }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Lock className="h-4 w-4" /> Payments can be connected with Stripe or Lemon Squeezy when you’re ready.
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: 'rgba(148,163,184,.12)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> SAT Trainer</div>
          <Link to="/signup" className="text-blue-400 hover:text-blue-300">Start free</Link>
        </div>
      </footer>
    </div>
  );
}
