import { useAuthStore } from '../stores/auth';
import { usePendingActionStore, PendingAction } from '../stores/pendingAction';
import { useAuthPopoverStore, AnchorPosition } from '../stores/authPopover';

export function useRequireAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setPendingAction = usePendingActionStore((state) => state.setPendingAction);

  /**
   * Checks if user is authenticated. If not, saves the pending action
   * and opens the auth popover. Returns true if authenticated, false if showing popover.
   * Pass anchor coordinates to position the popover near the trigger button.
   */
  const requireAuth = (pendingAction: PendingAction, anchor?: AnchorPosition): boolean => {
    if (isAuthenticated) {
      return true;
    }

    setPendingAction(pendingAction);
    useAuthPopoverStore.getState().open(anchor);
    return false;
  };

  return {
    isAuthenticated,
    requireAuth,
  };
}
