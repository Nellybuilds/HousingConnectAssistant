import { CronJob } from 'cron';
import { runHousingConnectScraper } from './housingConnectScraper';
import { runHPDScraper } from './hpdScraper';

/**
 * Schedule the Housing Connect scraper to run daily at 1:00 AM
 */
export function scheduleHousingConnectScraper(): void {
  const job = new CronJob(
    '0 1 * * *', // Cron time pattern: At 01:00 (1 AM) every day
    async () => {
      console.log('Running scheduled Housing Connect scraper...');
      await runHousingConnectScraper();
    },
    null, // onComplete
    false, // start
    'America/New_York' // timezone
  );
  
  job.start();
  console.log('Housing Connect scraper scheduled to run daily at 1:00 AM ET');
}

/**
 * Schedule the HPD rules scraper to run daily at 2:00 AM
 */
export function scheduleHPDScraper(): void {
  const job = new CronJob(
    '0 2 * * *', // Cron time pattern: At 02:00 (2 AM) every day
    async () => {
      console.log('Running scheduled HPD rules scraper...');
      await runHPDScraper();
    },
    null, // onComplete
    false, // start
    'America/New_York' // timezone
  );
  
  job.start();
  console.log('HPD rules scraper scheduled to run daily at 2:00 AM ET');
}

/**
 * Schedule all scrapers
 */
export function scheduleAllScrapers(): void {
  scheduleHousingConnectScraper();
  scheduleHPDScraper();
  console.log('All scrapers scheduled');
}

/**
 * Run all scrapers now (on-demand)
 */
export async function runAllScrapersNow(): Promise<void> {
  console.log('Running all scrapers immediately...');
  
  try {
    await runHousingConnectScraper();
  } catch (error) {
    console.error('Error running Housing Connect scraper:', error);
  }
  
  try {
    await runHPDScraper();
  } catch (error) {
    console.error('Error running HPD rules scraper:', error);
  }
  
  console.log('All scrapers completed');
}