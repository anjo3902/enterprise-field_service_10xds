import { NavigateFunction, useNavigate } from 'react-router';

export function useSafeBack() {
  const navigate = useNavigate();
  return (fallbackRoute: string) => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackRoute);
    }
  };
}

// Keeping this for backwards compatibility for non-refactored components
export const handleBackNavigation = (navigate: NavigateFunction, fallbackPath: string) => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
};
