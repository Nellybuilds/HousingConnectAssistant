/**
 * Interface for a housing listing scraped from Housing Connect
 */
export interface HousingListing {
  project_name: string;          // Name of the housing project
  address: string;               // Full address of the property
  application_deadline: string;  // Deadline date for application submission
  ami_range: string;             // Range of Area Median Income (AMI) requirements
  minimum_income: string;        // Minimum income required to qualify
  maximum_income: string;        // Maximum income allowed to qualify
  unit_sizes: string[];          // Array of available unit sizes (Studio, 1BR, 2BR, etc.)
  rent_prices: string[];         // Array of rent prices for different unit types
  application_link: string;      // Direct link to Housing Connect application page (https://housingconnect.nyc.gov/PublicWeb/details/...)
  project_description: string;   // Detailed description of the housing project
  special_requirements: string[]; // Array of special requirements or preferences
  last_updated: string;          // Timestamp when the listing was last updated
}