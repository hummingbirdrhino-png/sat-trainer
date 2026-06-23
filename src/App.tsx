import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { ThemeProvider } from '@/components/ThemeProvider';
import TopBar from '@/components/TopBar';
import RequireAuth from '@/components/RequireAuth';
import ModeSelection from '@/pages/ModeSelection';
import Practice from '@/pages/Practice';
import Results from '@/pages/Results';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import FocusedSetup from '@/pages/FocusedSetup';
import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import Upgrade from '@/pages/Upgrade';
import { sanitizeQuestions } from '@/lib/questionSanitizer';
import './App.css';

function AppContent() {
  const { setQuestions, setMathQuestions, setIsLoading } = useStore();

  useEffect(() => {
    // Load Reading/Writing and Math question banks from static JSON.
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        const [rwResponse, mathResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}questions.json`),
          fetch(`${import.meta.env.BASE_URL}math_questions.json`),
        ]);
        const rwData = await rwResponse.json();
        const mathData = mathResponse.ok ? await mathResponse.json() : [];
        setQuestions(sanitizeQuestions(rwData));
        setMathQuestions(sanitizeQuestions(mathData));
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [setQuestions, setMathQuestions, setIsLoading]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
      <TopBar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login defaultMode="register" />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/app" element={<RequireAuth><ModeSelection /></RequireAuth>} />
          <Route path="/practice" element={<RequireAuth><Practice /></RequireAuth>} />
          <Route path="/results" element={<RequireAuth><Results /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/focused-setup" element={<RequireAuth><FocusedSetup /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
