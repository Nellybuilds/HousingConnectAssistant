import React from "react";
import TutorialTooltip from "./TutorialTooltip";
import { useTutorial } from "@/hooks/useTutorial";

export default function Tutorial() {
  const { isActive } = useTutorial();

  if (!isActive) return null;

  return (
    <>
      {/* Welcome step */}
      <TutorialTooltip
        step="welcome"
        title="Welcome to Housing Connect Helper!"
        content={
          <div>
            <p>This tutorial will guide you through the main features of the Housing Connect Helper chatbot, designed to help you navigate affordable housing options.</p>
            <p className="mt-2">Let's get started!</p>
          </div>
        }
        position={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
        showPrevious={false}
      />
      
      {/* Chat Interface */}
      <TutorialTooltip
        step="chatInterface"
        title="Chat Interface"
        content={
          <p>This is the main chat area where you can interact with the Housing Connect Helper. You'll see responses here and can scroll through your conversation history.</p>
        }
        position={{
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
        targetSelector=".chat-height" // Add this class to the chat container
      />
      
      {/* Sidebar */}
      <TutorialTooltip
        step="sidebar"
        title="Conversation History"
        content={
          <p>Your previous conversations are saved here. You can click on any conversation to continue where you left off.</p>
        }
        position={{
          top: "40%",
          left: "250px"
        }}
        targetSelector=".sidebar" // Add this class to the sidebar
      />
      
      {/* Ask Question */}
      <TutorialTooltip
        step="askQuestion"
        title="Ask Questions"
        content={
          <div>
            <p>Type your housing-related questions here. For example:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>What is AMI?</li>
              <li>How do I apply for affordable housing?</li>
              <li>What documents do I need?</li>
            </ul>
          </div>
        }
        position={{
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)"
        }}
        targetSelector=".chat-input" // Add this class to the chat input
      />
      
      {/* Feedback */}
      <TutorialTooltip
        step="feedback"
        title="Provide Feedback"
        content={
          <p>After each response, you can let us know if it was helpful by clicking the thumbs up or down buttons. Your feedback helps us improve!</p>
        }
        position={{
          bottom: "180px",
          right: "100px"
        }}
        targetSelector=".feedback-buttons" // Add this class to the feedback buttons
      />
      
      {/* Dark Mode */}
      <TutorialTooltip
        step="darkMode"
        title="Light/Dark Mode"
        content={
          <p>Toggle between light and dark mode for comfortable viewing day or night. Click this button to switch themes.</p>
        }
        position={{
          top: "70px",
          right: "100px"
        }}
        targetSelector=".theme-toggle" // Add this class to the theme toggle
      />
      
      {/* Completed */}
      <TutorialTooltip
        step="completed"
        title="You're All Set!"
        content={
          <div>
            <p>You've completed the tutorial and are ready to use the Housing Connect Helper!</p>
            <p className="mt-2">If you ever need to see this tutorial again, you can find it in the settings menu.</p>
          </div>
        }
        position={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
        showNext={false}
        showSkip={false}
      />
    </>
  );
}