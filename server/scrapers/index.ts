import { scheduleAllScrapers, runAllScrapersNow } from './scheduler';
import * as api from './api';
import { scheduleSimpleScraper, runSimpleScraper } from './simpleScraper';

// Export the simple scraper instead of the complex one to avoid dependency issues
export { 
  scheduleSimpleScraper as scheduleAllScrapers, 
  runSimpleScraper as runAllScrapersNow,
  api
};