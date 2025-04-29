import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { HousingListing } from './types';

const DATA_DIR = path.join(__dirname, '../../data');
const LISTINGS_FILE = path.join(DATA_DIR, 'housingListings.json');

// Make sure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Initialize the listings file if it doesn't exist
 */
function initListingsFile(): void {
  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify([], null, 2));
    console.log('Created empty listings file');
  }
}

/**
 * Get existing listings to avoid duplicates
 */
function getExistingListings(): HousingListing[] {
  try {
    if (!fs.existsSync(LISTINGS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LISTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading existing listings file:', error);
    return [];
  }
}

/**
 * Save listings to a JSON file
 */
function saveListings(listings: HousingListing[]): void {
  try {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
    console.log(`Saved ${listings.length} listings to file`);
  } catch (error) {
    console.error('Error saving listings to file:', error);
  }
}

/**
 * Extract specific details from a listing page
 */
async function extractListingDetails(page: Page, url: string): Promise<HousingListing | null> {
  try {
    console.log(`Extracting details from ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('.project-details', { timeout: 30000 });
    
    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);
    
    // Extract listing details
    const projectName = $('.property-title h1').text().trim();
    const address = $('.property-address').text().trim();
    
    // Extract deadline
    let applicationDeadline = $('.deadline-date').text().trim();
    // Convert to ISO format if possible
    try {
      const dateMatch = applicationDeadline.match(/(\w+)\s+(\d+),\s+(\d+)/);
      if (dateMatch) {
        const [_, month, day, year] = dateMatch;
        const date = new Date(`${month} ${day}, ${year}`);
        if (!isNaN(date.getTime())) {
          applicationDeadline = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      }
    } catch (e) {
      console.log('Could not parse date, keeping original format');
    }
    
    // Extract AMI range
    const incomeInfoText = $('.income-requirements').text();
    const amiRangeMatch = incomeInfoText.match(/(\d+)%\s*-\s*(\d+)%\s*AMI/);
    const amiRange = amiRangeMatch ? `${amiRangeMatch[1]}%-${amiRangeMatch[2]}% AMI` : 'Not specified';
    
    // Extract other income info
    const minIncomeMatch = incomeInfoText.match(/Minimum[\\s:]*\$([\\d,]+)/i);
    const minimumIncome = minIncomeMatch ? `$${minIncomeMatch[1]}` : 'Not specified';
    
    const maxIncomeMatch = incomeInfoText.match(/Maximum[\\s:]*\$([\\d,]+)/i);
    const maximumIncome = maxIncomeMatch ? `$${maxIncomeMatch[1]}` : 'Not specified';
    
    // Extract unit sizes and rent prices
    const unitSizes: string[] = [];
    const rentPrices: string[] = [];
    
    $('.unit-info-container').each((_, element) => {
      const unitType = $(element).find('.unit-type').text().trim();
      if (unitType) unitSizes.push(unitType);
      
      const rent = $(element).find('.rent-amount').text().trim();
      if (rent) rentPrices.push(rent);
    });
    
    // Extract project description
    let projectDescription = $('.property-description').text().trim();
    if (!projectDescription) {
      projectDescription = $('.project-details p').first().text().trim();
    }
    
    // Extract special requirements
    const specialRequirements: string[] = [];
    $('.preference-container').each((_, element) => {
      const preference = $(element).text().trim();
      if (preference) specialRequirements.push(preference);
    });
    
    // Construct the listing object
    const listing: HousingListing = {
      project_name: projectName,
      address: address,
      application_deadline: applicationDeadline,
      ami_range: amiRange,
      minimum_income: minimumIncome,
      maximum_income: maximumIncome,
      unit_sizes: unitSizes,
      rent_prices: rentPrices,
      application_link: url,
      project_description: projectDescription,
      special_requirements: specialRequirements,
      last_updated: new Date().toISOString()
    };
    
    return listing;
  } catch (error) {
    console.error(`Error extracting details from ${url}:`, error);
    return null;
  }
}

/**
 * Get the list of property URLs from the main listings page
 */
async function getListingUrls(page: Page, baseUrl: string): Promise<string[]> {
  try {
    console.log('Getting listing URLs from Housing Connect');
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for listings to load
    await page.waitForSelector('.property-card', { timeout: 30000 });
    
    // Extract URLs
    const urls = await page.evaluate(() => {
      const propertyLinks = Array.from(document.querySelectorAll('.property-card a'));
      return propertyLinks.map(link => (link as HTMLAnchorElement).href);
    });
    
    console.log(`Found ${urls.length} listing URLs`);
    return urls;
  } catch (error) {
    console.error('Error getting listing URLs:', error);
    return [];
  }
}

/**
 * Handle pagination if it exists
 */
async function getAllListingUrls(page: Page, baseUrl: string): Promise<string[]> {
  const allUrls: string[] = [];
  let currentPage = 1;
  let hasNextPage = true;
  
  while (hasNextPage) {
    const pageUrl = `${baseUrl}?page=${currentPage}`;
    console.log(`Scraping page ${currentPage}`);
    
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    try {
      await page.waitForSelector('.property-card', { timeout: 15000 });
    } catch (error) {
      console.log(`No listings found on page ${currentPage}, stopping pagination`);
      break;
    }
    
    // Extract URLs on this page
    const urls = await page.evaluate(() => {
      const propertyLinks = Array.from(document.querySelectorAll('.property-card a'));
      return propertyLinks.map(link => (link as HTMLAnchorElement).href);
    });
    
    allUrls.push(...urls);
    console.log(`Found ${urls.length} listings on page ${currentPage}`);
    
    // Check if there's a next page
    const nextPageExists = await page.evaluate(() => {
      const nextButton = document.querySelector('.pagination-next:not(.disabled)');
      return !!nextButton;
    });
    
    if (nextPageExists) {
      currentPage++;
    } else {
      hasNextPage = false;
    }
  }
  
  return allUrls;
}

/**
 * Main scraper function
 */
export async function scrapeHousingConnect(): Promise<HousingListing[]> {
  let browser: Browser | null = null;
  
  try {
    console.log('Starting Housing Connect scraper');
    initListingsFile();
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Housing Connect base URL
    const baseUrl = 'https://housingconnect.nyc.gov/PublicWeb';
    
    // Get all listing URLs
    const listingUrls = await getAllListingUrls(page, baseUrl);
    
    // Get existing listings to check for duplicates
    const existingListings = getExistingListings();
    const existingUrls = new Set(existingListings.map(listing => listing.application_link));
    
    // Filter out URLs that we've already scraped
    const newUrls = listingUrls.filter(url => !existingUrls.has(url));
    console.log(`Found ${newUrls.length} new listings to scrape`);
    
    // Extract details from each listing
    const newListings: HousingListing[] = [];
    
    for (const url of newUrls) {
      const listing = await extractListingDetails(page, url);
      if (listing) {
        newListings.push(listing);
        
        // Save incrementally in case the process is interrupted
        if (newListings.length % 5 === 0) {
          const updatedListings = [...existingListings, ...newListings];
          saveListings(updatedListings);
        }
      }
    }
    
    // Save all listings
    const updatedListings = [...existingListings, ...newListings];
    saveListings(updatedListings);
    
    console.log(`Scraper finished. Added ${newListings.length} new listings.`);
    return updatedListings;
  } catch (error) {
    console.error('Error in Housing Connect scraper:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export a function to run the scraper on-demand
export async function runHousingConnectScraper(): Promise<void> {
  try {
    await scrapeHousingConnect();
  } catch (error) {
    console.error('Error running Housing Connect scraper:', error);
  }
}