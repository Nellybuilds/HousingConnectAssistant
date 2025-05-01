import { SUGGESTED_QUESTIONS } from "@/lib/constants";

interface ChatSuggestionsProps {
  onSelectQuestion: (question: string) => void;
}

export default function ChatSuggestions({ onSelectQuestion }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-col space-y-2 pl-10">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Here are some questions you might want to ask:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(question)}
            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
