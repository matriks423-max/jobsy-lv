import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Theme = "warm" | "dark" | "terracotta";

const STORAGE_KEY = "jobsy-theme";
const DEFAULT_THEME: Theme = "warm";

const THEME_ATTR: Record<Theme, string> = {
  warm: "",
  dark: "dark",
  terracotta: "terracotta",
};

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "warm" || stored === "dark" || stored === "terracotta") return stored;
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch { /* ignore */ }
    const attr = THEME_ATTR[t];
    if (attr) {
      document.documentElement.setAttribute("data-theme", attr);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // Apply theme on mount
  useEffect(() => {
    const attr = THEME_ATTR[theme];
    if (attr) {
      document.documentElement.setAttribute("data-theme", attr);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
