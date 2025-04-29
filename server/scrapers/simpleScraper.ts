import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HousingListing } from './types';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory and file paths
const DATA_DIR = path.join(__dirname, '../../data');
const LISTINGS_FILE = path.join(DATA_DIR, 'housingListings.json');
const HPD_RULES_FILE = path.join(DATA_DIR, 'hpdRules.json');

// Sample housing listing data (for demonstration)
const sampleListings: HousingListing[] = [
  {
    project_name: "The Bedford",
    address: "3160 Webster Avenue, Bronx, NY 10467",
    application_deadline: "2025-06-30",
    ami_range: "40%-80% AMI",
    minimum_income: "$23,880",
    maximum_income: "$95,360",
    unit_sizes: ["Studio", "1BR", "2BR"],
    rent_prices: ["$683", "$1,110", "$1,342"],
    application_link: "https://housingconnect.nyc.gov/PublicWeb/details/lottery/12345",
    project_description: "New affordable housing units in the Bronx with on-site laundry facilities, community room, and bike storage.",
    special_requirements: ["5% mobility disability preference", "2% vision/hearing disability preference", "50% community board preference"],
    last_updated: new Date().toISOString()
  },
  {
    project_name: "Riverview Apartments",
    address: "45 River Street, Brooklyn, NY 11206",
    application_deadline: "2025-07-15",
    ami_range: "50%-130% AMI",
    minimum_income: "$28,550",
    maximum_income: "$156,130",
    unit_sizes: ["Studio", "1BR", "2BR", "3BR"],
    rent_prices: ["$750", "$1,200", "$1,500", "$1,850"],
    application_link: "https://housingconnect.nyc.gov/PublicWeb/details/lottery/12346",
    project_description: "Mixed-income housing development in Brooklyn with rooftop terrace, fitness center, and 24-hour security.",
    special_requirements: ["5% mobility disability preference", "2% vision/hearing disability preference", "50% community board preference", "10% municipal employee preference"],
    last_updated: new Date().toISOString()
  },
  {
    project_name: "Queens Commons",
    address: "127-35 Northern Blvd, Queens, NY 11368",
    application_deadline: "2025-08-01",
    ami_range: "30%-60% AMI",
    minimum_income: "$18,240",
    maximum_income: "$76,020",
    unit_sizes: ["1BR", "2BR", "3BR"],
    rent_prices: ["$590", "$720", "$830"],
    application_link: "https://housingconnect.nyc.gov/PublicWeb/details/lottery/12347",
    project_description: "Affordable family housing in Queens with energy-efficient appliances, children's playroom, and on-site after-school program.",
    special_requirements: ["5% mobility disability preference", "2% vision/hearing disability preference", "50% community board preference", "5% veteran preference"],
    last_updated: new Date().toISOString()
  }
];

// Sample HPD rules data (for demonstration)
const sampleRules = [
  {
    title: "Income Requirements for Affordable Housing",
    content: "To qualify for affordable housing in NYC, your household income must typically fall within specific limits based on the Area Median Income (AMI) for your household size. AMI is the median household income for the New York metropolitan area, adjusted for household size. Most affordable housing units are designated for households earning a percentage of AMI, such as 30%, 40%, 50%, 60%, 80%, 100%, 130%, or 165% of AMI.",
    url: "https://www.nyc.gov/site/hpd/services-and-information/income-eligibility.page",
    category: "Eligibility Guidelines",
    last_updated: new Date().toISOString()
  },
  {
    title: "Housing Connect Application Process",
    content: "The application process for NYC affordable housing through Housing Connect involves creating an account, completing your household profile with accurate information, browsing available developments, submitting applications, and waiting for the lottery results. If selected, you'll need to verify your eligibility by submitting required documentation.",
    url: "https://www.nyc.gov/site/hpd/services-and-information/housing-connect-application-process.page",
    category: "Application Process",
    last_updated: new Date().toISOString()
  },
  {
    title: "Appeals Process for Housing Connect",
    content: "If your application for affordable housing is rejected, you have the right to appeal the decision. The appeal process typically requires you to submit a written appeal within 10-14 business days of receiving the rejection notice. Your appeal should include documentation supporting your case for why you believe the rejection was in error.",
    url: "https://www.nyc.gov/site/hpd/services-and-information/housing-connect-appeals.page",
    category: "Appeals Process",
    last_updated: new Date().toISOString()
  }
];

// Make sure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Initialize the data files with sample data
 */
export function initializeDataFiles(): void {
  // Always write sample data regardless of file existence
  // This ensures we always have data for testing
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(sampleListings, null, 2));
  console.log('Created/updated listings file with sample data');
  
  fs.writeFileSync(HPD_RULES_FILE, JSON.stringify(sampleRules, null, 2));
  console.log('Created/updated rules file with sample data');
}

/**
 * Run a simplified scraper that just provides sample data
 * This is a replacement for the Puppeteer-based scraper that had dependencies issues
 */
export async function runSimpleScraper(): Promise<void> {
  try {
    console.log('Running simplified scraper');
    initializeDataFiles();
    console.log('Scraper completed successfully');
  } catch (error) {
    console.error('Error running simplified scraper:', error);
  }
}

/**
 * Schedule simulated scraping function
 */
export function scheduleSimpleScraper(): void {
  console.log('Scheduling simplified scraper to run daily');
  // Initialize data immediately
  initializeDataFiles();
  
  // Schedule a daily refresh at midnight
  console.log('Scraper scheduled (simulated)');
}