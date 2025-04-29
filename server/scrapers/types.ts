/**
 * Interface for a housing listing scraped from Housing Connect
 */
export interface HousingListing {
  project_name: string;
  address: string;
  application_deadline: string;
  ami_range: string;
  minimum_income: string;
  maximum_income: string;
  unit_sizes: string[];
  rent_prices: string[];
  application_link: string;
  project_description: string;
  special_requirements: string[];
  last_updated: string;
}