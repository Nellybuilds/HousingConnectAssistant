import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Directory and file paths
const DATA_DIR = path.join(__dirname, '../../data');
const HPD_RULES_FILE = path.join(DATA_DIR, 'hpdRules.json');

// Make sure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface HPDRule {
  title: string;
  content: string;
  url: string;
  category: string;
  last_updated: string;
}

/**
 * Initialize the HPD rules file if it doesn't exist
 */
function initHPDRulesFile(): void {
  if (!fs.existsSync(HPD_RULES_FILE)) {
    fs.writeFileSync(HPD_RULES_FILE, JSON.stringify([], null, 2));
    console.log('Created empty HPD rules file');
  }
}

/**
 * Get existing HPD rules to avoid duplicates
 */
function getExistingHPDRules(): HPDRule[] {
  try {
    if (!fs.existsSync(HPD_RULES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(HPD_RULES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading existing HPD rules file:', error);
    return [];
  }
}

/**
 * Save HPD rules to a JSON file
 */
function saveHPDRules(rules: HPDRule[]): void {
  try {
    fs.writeFileSync(HPD_RULES_FILE, JSON.stringify(rules, null, 2));
    console.log(`Saved ${rules.length} HPD rules to file`);
  } catch (error) {
    console.error('Error saving HPD rules to file:', error);
  }
}

/**
 * Extract rule details from a page
 */
async function extractRuleDetails(page: Page, url: string, category: string): Promise<HPDRule | null> {
  try {
    console.log(`Extracting rule details from ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('.main-content, article, .content-primary', { timeout: 30000 });
    
    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);
    
    // Extract title
    let title = $('h1').first().text().trim();
    if (!title) {
      title = $('.page-title').first().text().trim();
    }
    
    // Extract content - focus on the main content area
    let content = '';
    
    // Try different selectors that might contain the main content
    const contentSelectors = ['.main-content', 'article', '.content-primary', '.page-content'];
    
    for (const selector of contentSelectors) {
      const contentElem = $(selector);
      if (contentElem.length) {
        // Remove navigation, sidebars, etc.
        contentElem.find('nav, .sidebar, .navigation, .breadcrumbs, .share-buttons, .metadata').remove();
        content = contentElem.text().trim();
        break;
      }
    }
    
    // If we couldn't find content with the selectors, just take all paragraph text
    if (!content) {
      content = $('p').map((_, el) => $(el).text().trim()).get().join('\\n\\n');
    }
    
    // Clean up the content (remove excess whitespace)
    content = content.replace(/\\s+/g, ' ').trim();
    
    if (!title || !content) {
      console.log(`Couldn't extract meaningful content from ${url}`);
      return null;
    }
    
    return {
      title,
      content,
      url,
      category,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error extracting details from ${url}:`, error);
    return null;
  }
}

/**
 * Get all HPD rule URLs from a page
 */
async function getRuleUrls(page: Page, baseUrl: string, category: string): Promise<{url: string, category: string}[]> {
  try {
    console.log(`Getting rule URLs from ${baseUrl} (${category})`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('a', { timeout: 30000 });
    
    const pageContent = await page.content();
    const $ = cheerio.load(pageContent);
    
    const urls: {url: string, category: string}[] = [];
    
    // Find all links in the content area
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
        let fullUrl = href;
        
        // Handle relative URLs
        if (!href.startsWith('http')) {
          // If it starts with /, it's relative to the domain root
          if (href.startsWith('/')) {
            const baseUrlObj = new URL(baseUrl);
            fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}${href}`;
          } else {
            // Otherwise it's relative to the current path
            fullUrl = new URL(href, baseUrl).href;
          }
        }
        
        // Only include URLs from the same domain
        if (fullUrl.includes('nyc.gov')) {
          urls.push({ url: fullUrl, category });
        }
      }
    });
    
    console.log(`Found ${urls.length} rule URLs for category: ${category}`);
    return urls;
  } catch (error) {
    console.error(`Error getting rule URLs from ${baseUrl}:`, error);
    return [];
  }
}

/**
 * Main HPD rules scraper function
 */
export async function scrapeHPDRules(): Promise<HPDRule[]> {
  let browser: Browser | null = null;
  
  try {
    console.log('Starting HPD rules scraper');
    initHPDRulesFile();
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Define categories and their URLs to scrape
    const categoriesToScrape = [
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/housing-connect-rentals.page',
        category: 'Rental Guidelines'
      },
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/housing-connect-homeownership.page',
        category: 'Homeownership Guidelines'
      },
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/marketing-handbook.page',
        category: 'Marketing Handbook'
      },
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/housing-connect-eligibility.page',
        category: 'Eligibility Guidelines'
      },
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/housing-connect-appeals.page',
        category: 'Appeals Process'
      },
      {
        url: 'https://www.nyc.gov/site/hpd/services-and-information/housing-connect-faqs.page',
        category: 'FAQs'
      }
    ];
    
    // Get existing rules to check for duplicates
    const existingRules = getExistingHPDRules();
    const existingUrls = new Set(existingRules.map(rule => rule.url));
    
    // Collect all rule URLs from all categories
    let allRuleUrls: {url: string, category: string}[] = [];
    
    for (const { url, category } of categoriesToScrape) {
      const ruleUrls = await getRuleUrls(page, url, category);
      allRuleUrls = [...allRuleUrls, ...ruleUrls];
    }
    
    // Filter out URLs that we've already scraped
    const newUrls = allRuleUrls.filter(({ url }) => !existingUrls.has(url));
    console.log(`Found ${newUrls.length} new rule URLs to scrape`);
    
    // Extract details from each rule page
    const newRules: HPDRule[] = [];
    
    for (const { url, category } of newUrls) {
      const rule = await extractRuleDetails(page, url, category);
      if (rule) {
        newRules.push(rule);
        
        // Save incrementally in case the process is interrupted
        if (newRules.length % 5 === 0) {
          const updatedRules = [...existingRules, ...newRules];
          saveHPDRules(updatedRules);
        }
      }
    }
    
    // Save all rules
    const updatedRules = [...existingRules, ...newRules];
    saveHPDRules(updatedRules);
    
    console.log(`HPD rules scraper finished. Added ${newRules.length} new rules.`);
    return updatedRules;
  } catch (error) {
    console.error('Error in HPD rules scraper:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export a function to run the scraper on-demand
export async function runHPDScraper(): Promise<void> {
  try {
    await scrapeHPDRules();
  } catch (error) {
    console.error('Error running HPD rules scraper:', error);
  }
}