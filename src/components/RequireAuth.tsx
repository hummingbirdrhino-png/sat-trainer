import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const userId = useStore((state) => state.userId);
  const location = useLocation();

  if (!userId) {
    return <Navigate to="/signup" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
