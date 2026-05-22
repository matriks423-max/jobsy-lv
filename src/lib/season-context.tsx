import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(): Season {
  const m = new Date().getMonth(); // 0–11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

const SeasonContext = createContext<Season>('summer');

export function SeasonProvider({ children }: { children: ReactNode }) {
  const season = getSeason();

  useEffect(() => {
    document.documentElement.setAttribute('data-season', season);
    return () => {
      document.documentElement.removeAttribute('data-season');
    };
  }, [season]);

  return (
    <SeasonContext.Provider value={season}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason(): Season {
  return useContext(SeasonContext);
}
