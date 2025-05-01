import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Get initial theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if theme was saved in localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      return savedTheme;
    }
    
    // If no saved theme, check system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    
    // Default to light theme
    return "light";
  });

  // Update the document with the current theme
  useEffect(() => {
    // Update theme.json with the new appearance
    const updateThemeJson = async () => {
      try {
        const response = await fetch("/theme.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant: "professional",
            primary: "hsl(217, 91%, 60%)",
            appearance: theme,
            radius: 0.5
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update theme: ${response.status} ${response.statusText}`);
        }
        
        console.log("Theme updated successfully on server");
      } catch (error) {
        console.error("Failed to update theme.json", error);
        // Continue anyway, at least we'll have local storage
      }
    };

    // Update document class
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Save to localStorage
    localStorage.setItem("theme", theme);
    
    // Update theme.json
    updateThemeJson();
  }, [theme]);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}