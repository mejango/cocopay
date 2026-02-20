import { router } from 'expo-router';
import { useAuthStore } from '../stores/auth';
import { usePendingActionStore, PendingAction } from '../stores/pendingAction';

export function useRequireAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setPendingAction = usePendingActionStore((state) => state.setPendingAction);

  /**
   * Checks if user is authenticated. If not, saves the pending action
   * and redirects to auth. Returns true if authenticated, false if redirecting.
   */
  const requireAuth = (pendingAction: PendingAction): boolean => {
    if (isAuthenticated) {
      return true;
    }

    setPendingAction(pendingAction);
    router.push('/auth');
    return false;
  };

  return {
    isAuthenticated,
    requireAuth,
  };
}
