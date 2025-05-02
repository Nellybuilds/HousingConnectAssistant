import React, { createContext, useContext, useState, useEffect } from "react";

export type TutorialStep = 
  | "welcome" 
  | "chatInterface" 
  | "sidebar" 
  | "askQuestion" 
  | "feedback" 
  | "darkMode" 
  | "completed";

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: TutorialStep) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Ordered tutorial steps
const tutorialSteps: TutorialStep[] = [
  "welcome",
  "chatInterface",
  "sidebar",
  "askQuestion",
  "feedback",
  "darkMode",
  "completed"
];

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>("welcome");

  // Check if this is the first time the user is visiting
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial) {
      // Delay the tutorial start to allow the UI to load completely
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStep("welcome");
  };

  const skipTutorial = () => {
    setIsActive(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const nextStep = () => {
    const currentIndex = tutorialSteps.indexOf(currentStep);
    if (currentIndex < tutorialSteps.length - 1) {
      setCurrentStep(tutorialSteps[currentIndex + 1]);
    } else {
      // Tutorial completed
      setIsActive(false);
      localStorage.setItem("hasSeenTutorial", "true");
    }
  };

  const previousStep = () => {
    const currentIndex = tutorialSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(tutorialSteps[currentIndex - 1]);
    }
  };

  const goToStep = (step: TutorialStep) => {
    if (tutorialSteps.includes(step)) {
      setCurrentStep(step);
    }
  };

  return (
    <TutorialContext.Provider 
      value={{ 
        isActive, 
        currentStep, 
        startTutorial, 
        skipTutorial, 
        nextStep, 
        previousStep, 
        goToStep 
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}