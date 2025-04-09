// Fallback chat module for when OpenAI API is unavailable

// Knowledge base with common questions about Housing Connect
const knowledgeBase = [
  {
    question: "How do I apply for housing?",
    answer: "You can apply by visiting the Housing Connect website and creating an account. Follow the instructions to apply for available listings."
  },
  {
    question: "What documents do I need?",
    answer: "You'll typically need photo ID, proof of income, and documents that show your household size. Specific listings may require additional documentation such as birth certificates, Social Security cards, tax returns, or asset statements."
  },
  {
    question: "How long does it take to hear back?",
    answer: "It can take several months after you apply to receive any updates. The typical timeline involves application submission, initial eligibility screening (2-4 weeks), document verification (1-2 months), interview (if selected), and final eligibility determination. Make sure your contact info is correct in your Housing Connect account."
  },
  {
    question: "What is Housing Connect?",
    answer: "Housing Connect is a platform that helps individuals and families find and apply for affordable housing opportunities in one place. It simplifies the process by allowing users to create a single profile that can be used to apply to multiple housing developments."
  },
  {
    question: "Am I eligible for affordable housing?",
    answer: "Eligibility depends on factors like your income, household size, and specific development requirements. Typically, households must earn between 30% and 165% of Area Median Income (AMI) to qualify for different housing options. Other factors include credit history, rental history, and background checks."
  },
  {
    question: "Is there an application fee?",
    answer: "There is no fee to create a Housing Connect profile. Some developments may have application fees, but many affordable housing options have no application fees."
  },
  {
    question: "How many housing options can I apply for?",
    answer: "You can apply to as many housing options as you qualify for through Housing Connect. There is no limit to the number of applications you can submit."
  },
  {
    question: "What if my information changes?",
    answer: "Update your Housing Connect profile immediately if there are changes to your household size or income. Keeping your information current ensures you're considered for appropriate housing options and prevents delays in processing."
  }
];

/**
 * Find the best answer from the knowledge base using string matching
 */
export function findBestAnswer(userQuestion: string): string {
  const lowerQ = userQuestion.toLowerCase();
  
  // Simple exact keyword matching first
  for (const entry of knowledgeBase) {
    if (lowerQ.includes(entry.question.toLowerCase())) {
      return entry.answer;
    }
  }

  // More flexible matching using keywords
  const keywordMatches = knowledgeBase.map(entry => {
    const questionWords = entry.question.toLowerCase().split(/\s+/);
    const matchCount = questionWords.filter(word => 
      word.length > 3 && lowerQ.includes(word)
    ).length;
    
    return {
      entry,
      matchCount,
      matchRatio: matchCount / questionWords.length
    };
  });

  // Find best match with at least some matching keywords
  const bestMatch = keywordMatches.reduce((best, current) => {
    return (current.matchRatio > best.matchRatio) ? current : best;
  }, { matchRatio: 0, entry: null as any });

  if (bestMatch.matchRatio >= 0.3 && bestMatch.entry) {
    return bestMatch.entry.answer;
  }

  return "I don't have specific information about that. Please ask about Housing Connect applications, eligibility, required documents, or application timelines.";
}