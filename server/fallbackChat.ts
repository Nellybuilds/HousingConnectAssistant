// Fallback chat module for when OpenAI API is unavailable
import { housingConnectKnowledge } from './knowledge';

// Knowledge base with common questions about Housing Connect
const knowledgeBase = [
  {
    question: "How do I apply for housing?",
    answer: "You can apply by visiting the Housing Connect website and creating an account. Complete your Household Profile with accurate information, browse available housing options, select and apply for developments you're interested in, submit required documentation, and track your application status through your dashboard.",
    keywords: ["apply", "application", "how to apply", "sign up", "register", "create account", "profile", "process"]
  },
  {
    question: "What documents do I need?",
    answer: "When applying through Housing Connect, you may need to provide: photo ID for all adult household members, birth certificates for all household members, Social Security cards or documentation of legal residency, income verification (pay stubs, tax returns, W-2 forms), asset documentation (bank statements), current lease and rent receipts, and disability documentation (if applicable). Some developments may require additional specific documents.",
    keywords: ["documents", "documentation", "paperwork", "id", "identification", "proof", "verification", "birth certificate", "social security", "income", "tax"]
  },
  {
    question: "How long does it take to hear back?",
    answer: "The affordable housing application process can take several months to a year depending on availability. The typical timeline includes: application submission, initial eligibility screening (2-4 weeks), document verification (1-2 months), interview (if selected), final eligibility determination, apartment offer (if qualified), and lease signing. Make sure your contact information is correct in your Housing Connect account.",
    keywords: ["timeline", "wait", "waiting", "time", "hear back", "response", "notification", "status", "update", "process", "long"]
  },
  {
    question: "What is Housing Connect?",
    answer: "Housing Connect is an affordable housing platform that helps individuals and families find and apply for affordable housing opportunities in one place. It simplifies the process by allowing users to create a single profile that can be used to apply to multiple housing developments. The platform eliminates the need to fill out separate applications for each development.",
    keywords: ["what is", "about", "platform", "service", "website", "housing connect", "purpose", "how it works"]
  },
  {
    question: "What is AMI?",
    answer: "Area Median Income (AMI) is a metric used to determine eligibility for affordable housing programs. AMI is the midpoint of a region's income distribution – half of households earn more and half earn less. It's calculated annually by the U.S. Department of Housing and Urban Development (HUD) and varies by location and household size. Housing programs typically define affordability in relation to AMI percentages: Extremely Low Income (0-30%), Very Low Income (31-50%), Low Income (51-80%), Moderate Income (81-120%), and Middle Income (121-165%).",
    keywords: ["ami", "area median income", "income", "median", "eligibility", "qualification", "percentage", "income level", "income limit"]
  },
  {
    question: "Am I eligible for affordable housing?",
    answer: "Eligibility depends on factors like your income, household size, and specific development requirements. Typically, households must earn between 30% and 165% of Area Median Income (AMI) to qualify for different housing options. Other eligibility factors include household size matching apartment requirements, credit history, rental history, criminal background checks, and possibly citizenship or eligible immigration status. Some properties also have age restrictions for senior housing.",
    keywords: ["eligible", "eligibility", "qualify", "qualification", "requirements", "income", "limits", "limits", "who can apply", "can I apply"]
  },
  {
    question: "Is there an application fee?",
    answer: "There is no fee to create a Housing Connect profile. Some developments may have application fees, but many affordable housing options have no application fees. Any required fees will be clearly indicated in the listing details before you apply.",
    keywords: ["fee", "cost", "price", "payment", "charge", "expense", "free", "pay", "application fee"]
  },
  {
    question: "How many housing options can I apply for?",
    answer: "You can apply to as many housing options as you qualify for through Housing Connect. There is no limit to the number of applications you can submit. In fact, applying to multiple developments can increase your chances of securing affordable housing.",
    keywords: ["how many", "limit", "multiple", "several", "number", "applications", "options", "listings", "developments"]
  },
  {
    question: "What if my information changes?",
    answer: "Update your Housing Connect profile immediately if there are changes to your household size or income. Keeping your information current ensures you're considered for appropriate housing options and prevents delays in processing. Most affordable housing programs require annual income recertification, and failure to report income changes may result in back-rent charges or program termination.",
    keywords: ["change", "update", "modification", "information", "profile", "details", "income change", "household change", "status change"]
  },
  {
    question: "What types of housing are available?",
    answer: "Housing Connect offers various types of affordable housing options including: Public Housing (government-owned properties managed by local housing authorities), Section 8/Housing Choice Vouchers (subsidies for private market apartments), Low-Income Housing Tax Credit Properties (privately developed affordable housing), Mitchell-Lama Housing (middle-income rental and cooperative housing), Inclusionary Housing (affordable units in market-rate developments), and Supportive Housing (combines affordable housing with supportive services).",
    keywords: ["types", "housing", "options", "available", "properties", "apartments", "units", "public housing", "section 8", "vouchers", "tax credit", "supportive"]
  },
  {
    question: "How is rent calculated?",
    answer: "For many affordable housing programs, your rent will be calculated based on your total household income, the specific housing program rules, and the AMI level the unit is designated for. Common rent calculations include 30% of adjusted household income (common in public housing), fixed rent based on AMI percentage (common in LIHTC properties), or market rate minus subsidy (voucher programs). Most programs require annual income recertification to adjust rent as needed.",
    keywords: ["rent", "cost", "price", "payment", "calculate", "determination", "amount", "monthly", "income", "percentage"]
  },
  {
    question: "What is the lottery system?",
    answer: "Many affordable housing opportunities use a lottery system where applications received during the open period are randomly assigned a number. Applications are then reviewed in lottery number order, so having a low lottery number increases your chances of being selected. Some applicants may receive preference based on local requirements such as residency, disability status, or other criteria.",
    keywords: ["lottery", "random", "selection", "chance", "number", "odds", "preference", "priority", "chosen", "selection process"]
  },
  {
    question: "Do I need to be a citizen?",
    answer: "Eligibility requirements vary by program. While some housing programs require U.S. citizenship or eligible immigration status, others may be available to all residents regardless of immigration status. The specific requirements will be listed in each housing development's criteria.",
    keywords: ["citizen", "citizenship", "immigration", "status", "undocumented", "legal", "residency", "green card", "visa", "documentation"]
  },
  {
    question: "What are my rights as a tenant?",
    answer: "As an affordable housing tenant, you have rights including the right to fair treatment without discrimination, the right to a safe and habitable dwelling, the right to proper notice before landlord entry, the right to request repairs, protection against unfair eviction, and reasonable accommodations for disabilities. Many jurisdictions have additional tenant protections under local housing laws.",
    keywords: ["rights", "tenant rights", "protections", "legal", "fair housing", "discrimination", "eviction", "repairs", "accommodations", "landlord"]
  }
];

// Add more specific topic searches
const topicKeywords: Record<string, string[]> = {
  "application": ["apply", "application", "sign up", "register", "profile", "process", "submit"],
  "eligibility": ["eligible", "qualify", "requirements", "income", "limits", "ami", "area median income"],
  "documents": ["documents", "paperwork", "id", "identification", "proof", "verification"],
  "timeline": ["timeline", "wait", "waiting", "time", "how long", "process", "hear back"],
  "housing types": ["types", "housing", "options", "properties", "apartments", "units", "public housing", "section 8"],
  "rent": ["rent", "cost", "price", "payment", "calculate", "amount", "monthly", "percentage"],
  "rights": ["rights", "tenant", "protections", "legal", "fair housing", "discrimination", "eviction"],
  "lottery": ["lottery", "random", "selection", "chance", "number", "odds", "preference", "priority"]
};

/**
 * Find the best answer from the knowledge base using improved matching
 */
export function findBestAnswer(userQuestion: string): string {
  const lowerQ = userQuestion.toLowerCase();
  
  // 1. Direct question matching
  for (const entry of knowledgeBase) {
    if (lowerQ.includes(entry.question.toLowerCase())) {
      return entry.answer;
    }
  }

  // 2. Keyword matching
  let bestEntry = null;
  let highestScore = 0;
  
  for (const entry of knowledgeBase) {
    let score = 0;
    
    // Check for exact keyword matches
    for (const keyword of entry.keywords) {
      if (lowerQ.includes(keyword.toLowerCase())) {
        // Give higher weight to longer keyword matches
        score += keyword.length / 2;
      }
    }
    
    // Check for partial keyword matches
    const words = lowerQ.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) { // Only consider meaningful words
        for (const keyword of entry.keywords) {
          if (keyword.toLowerCase().includes(word)) {
            score += 1;
          }
        }
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
    }
  }
  
  // If we found a good match based on keywords
  if (highestScore > 3 && bestEntry) {
    return bestEntry.answer;
  }
  
  // 3. Topic-based search as a fallback
  let topicMatch = null;
  let topicScore = 0;
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerQ.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > topicScore) {
      topicScore = score;
      topicMatch = topic;
    }
  }
  
  // If we found a matching topic but no specific answer
  if (topicScore > 0 && topicMatch) {
    // Return a general response about the topic
    return `I have information about ${topicMatch} for Housing Connect. Could you ask a more specific question about ${topicMatch}, such as the requirements, process, or options available?`;
  }
  
  // 4. Check for common question variations
  if (lowerQ.includes("what is") || lowerQ.includes("explain") || lowerQ.includes("define") || lowerQ.includes("tell me about")) {
    const words = lowerQ.split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        // Look for entries that might explain this term
        for (const entry of knowledgeBase) {
          if (entry.question.toLowerCase().includes(word)) {
            return entry.answer;
          }
        }
      }
    }
  }
  
  // 5. Default response if no good match found
  return "I don't have specific information about that. Please ask about Housing Connect applications, eligibility criteria, housing options, required documents, or application timelines. You can also ask about AMI (Area Median Income), rent calculation, or tenant rights.";
}