interface ChatSuggestionsProps {
  onSelectQuestion: (question: string) => void;
}

export default function ChatSuggestions({ onSelectQuestion }: ChatSuggestionsProps) {
  const suggestedQuestions = [
    "What is Housing Connect?",
    "Am I eligible for affordable housing?",
    "How do I apply?",
    "What documents do I need?"
  ];

  return (
    <div className="flex flex-col space-y-2 pl-10">
      <p className="text-sm text-gray-600 mb-1">Here are some questions you might want to ask:</p>
      <div className="flex flex-wrap gap-2">
        {suggestedQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(question)}
            className="bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-full px-3 py-1.5 text-sm text-gray-700 transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
