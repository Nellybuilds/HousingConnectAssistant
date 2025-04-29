import path from 'path';
import fs from 'fs';
import { HousingListing } from './types';
import { runAllScrapersNow } from './scheduler';

// Data file paths
const DATA_DIR = path.join(__dirname, '../../data');
const LISTINGS_FILE = path.join(DATA_DIR, 'housingListings.json');
const HPD_RULES_FILE = path.join(DATA_DIR, 'hpdRules.json');

// Make sure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
function initializeFiles() {
  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(HPD_RULES_FILE)) {
    fs.writeFileSync(HPD_RULES_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Get all housing listings
 */
export function getAllListings(): HousingListing[] {
  try {
    initializeFiles();
    
    if (!fs.existsSync(LISTINGS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(LISTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading listings file:', error);
    return [];
  }
}

/**
 * Get all HPD rules
 */
export function getAllHPDRules(): any[] {
  try {
    initializeFiles();
    
    if (!fs.existsSync(HPD_RULES_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(HPD_RULES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading HPD rules file:', error);
    return [];
  }
}

/**
 * Get listings by AMI range
 */
export function getListingsByAMI(amiPercentage: number): HousingListing[] {
  try {
    const listings = getAllListings();
    
    // Filter listings by AMI range
    return listings.filter(listing => {
      // Parse AMI range from "40%-80% AMI" format
      const amiRangeMatch = listing.ami_range.match(/(\d+)%\s*-\s*(\d+)%/);
      
      if (amiRangeMatch) {
        const minAMI = parseInt(amiRangeMatch[1]);
        const maxAMI = parseInt(amiRangeMatch[2]);
        
        // Check if the specified AMI percentage falls within the range
        return amiPercentage >= minAMI && amiPercentage <= maxAMI;
      }
      
      return false;
    });
  } catch (error) {
    console.error('Error filtering listings by AMI:', error);
    return [];
  }
}

/**
 * Search for listings by keywords in project name or description
 */
export function searchListings(query: string): HousingListing[] {
  try {
    const listings = getAllListings();
    const lowerQuery = query.toLowerCase();
    
    // Search in project name, description, and address
    return listings.filter(listing => {
      return (
        listing.project_name.toLowerCase().includes(lowerQuery) ||
        listing.project_description.toLowerCase().includes(lowerQuery) ||
        listing.address.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('Error searching listings:', error);
    return [];
  }
}

/**
 * Get listings by unit size (e.g., "1BR", "2BR", "Studio")
 */
export function getListingsByUnitSize(unitSize: string): HousingListing[] {
  try {
    const listings = getAllListings();
    const normalizedUnitSize = unitSize.toLowerCase().trim();
    
    return listings.filter(listing => {
      return listing.unit_sizes.some(size => 
        size.toLowerCase().includes(normalizedUnitSize)
      );
    });
  } catch (error) {
    console.error('Error filtering listings by unit size:', error);
    return [];
  }
}

/**
 * Get listings that are still open for applications (deadline has not passed)
 */
export function getOpenListings(): HousingListing[] {
  try {
    const listings = getAllListings();
    const today = new Date();
    
    return listings.filter(listing => {
      try {
        // Try to parse the deadline date
        const deadline = new Date(listing.application_deadline);
        return deadline > today;
      } catch (error) {
        // If we can't parse the date, include the listing to be safe
        return true;
      }
    });
  } catch (error) {
    console.error('Error filtering open listings:', error);
    return [];
  }
}

/**
 * Search HPD rules by keywords
 */
export function searchHPDRules(query: string): any[] {
  try {
    const rules = getAllHPDRules();
    const lowerQuery = query.toLowerCase();
    
    return rules.filter(rule => {
      return (
        rule.title.toLowerCase().includes(lowerQuery) ||
        rule.content.toLowerCase().includes(lowerQuery) ||
        rule.category.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('Error searching HPD rules:', error);
    return [];
  }
}

/**
 * Get HPD rules by category
 */
export function getHPDRulesByCategory(category: string): any[] {
  try {
    const rules = getAllHPDRules();
    const normalizedCategory = category.toLowerCase().trim();
    
    return rules.filter(rule => 
      rule.category.toLowerCase().includes(normalizedCategory)
    );
  } catch (error) {
    console.error('Error filtering HPD rules by category:', error);
    return [];
  }
}

/**
 * Run scrapers on-demand
 */
export async function runScrapersOnDemand(): Promise<{ success: boolean, message: string }> {
  try {
    await runAllScrapersNow();
    return { success: true, message: 'Scrapers executed successfully' };
  } catch (error) {
    console.error('Error running scrapers on-demand:', error);
    return { success: false, message: 'Error running scrapers: ' + error.message };
  }
}