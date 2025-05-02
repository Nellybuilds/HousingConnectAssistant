import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTutorial, TutorialStep } from "@/hooks/useTutorial";
import { X } from "lucide-react";

interface TooltipPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
}

interface TutorialTooltipProps {
  step: TutorialStep;
  title: string;
  content: React.ReactNode;
  position: TooltipPosition;
  targetSelector?: string; // CSS selector to highlight a specific element
  showPrevious?: boolean;
  showNext?: boolean;
  showSkip?: boolean;
}

export default function TutorialTooltip({
  step,
  title,
  content,
  position,
  targetSelector,
  showPrevious = true,
  showNext = true,
  showSkip = true,
}: TutorialTooltipProps) {
  const { isActive, currentStep, nextStep, previousStep, skipTutorial } = useTutorial();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  
  // Determine if this tooltip should be shown
  const isVisible = isActive && currentStep === step;
  
  // Find and highlight the target element
  useEffect(() => {
    if (isVisible && targetSelector) {
      const element = document.querySelector(targetSelector) as HTMLElement;
      if (element) {
        setTargetElement(element);
        
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          position: 'absolute',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: 48, // Just below tooltip but above other elements
          pointerEvents: 'none' // Allow clicking through the highlight
        });
      }
    }
    
    return () => {
      setTargetElement(null);
      setHighlightStyle({});
    };
  }, [isVisible, targetSelector]);
  
  if (!isVisible) return null;
  
  return (
    <>
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        style={{ backdropFilter: 'blur(2px)' }}
      />
      
      {/* Target highlight */}
      {targetSelector && (
        <div 
          className="rounded-md border-2 border-primary ring-4 ring-primary/20 animate-pulse"
          style={highlightStyle} 
        />
      )}
      
      {/* Tooltip */}
      <div 
        className={`fixed z-50 w-80 bg-background rounded-lg shadow-lg border border-border p-4`}
        style={position}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={skipTutorial}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mb-4 text-sm text-muted-foreground">
          {content}
        </div>
        
        <div className="flex justify-between">
          <div>
            {showPrevious && currentStep !== "welcome" && (
              <Button
                variant="outline"
                size="sm"
                onClick={previousStep}
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            {showSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTutorial}
              >
                Skip
              </Button>
            )}
            
            {showNext && (
              <Button
                variant="default"
                size="sm"
                onClick={nextStep}
              >
                {currentStep === "darkMode" ? "Finish" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}