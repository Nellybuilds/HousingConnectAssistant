import React from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useTutorial } from "@/hooks/useTutorial";

export default function TutorialButton() {
  const { startTutorial } = useTutorial();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      onClick={startTutorial}
      title="Start Tutorial"
    >
      <HelpCircle className="h-5 w-5" />
    </Button>
  );
}