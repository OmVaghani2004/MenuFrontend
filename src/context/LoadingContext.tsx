import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextValue {
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track count of in-flight requests so nested/parallel calls don't hide too early
  const [count, setCount] = useState(0);

  const showLoader = useCallback(() => setCount(c => c + 1), []);
  const hideLoader = useCallback(() => setCount(c => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider value={{ isLoading: count > 0, showLoader, hideLoader }}>
      {children}
    </LoadingContext.Provider>
  );
};
