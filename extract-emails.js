// extract-emails.js
import fs from 'fs';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch'; // for Node 18+ you can use global fetch

// --- CONFIG ---
// Path to JSON file created by GitHub workflow
const linksFile = 'links.json';
// Webhook URL for n8n to receive results
const webhookUrl = 'https://n8n.knotastain.com/webhook-test/bd3e27d0-fb3a-465f-819d-6f748fa85eb7';
// Email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

// --- READ LINKS ---
const links = JSON.parse(fs.readFileSync(linksFile, 'utf-8'));
console.log('Links to scrape:', links);

const results = [];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  for (const url of links) {
    try {
      console.log(`Checking: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // --- CLOSE POPUPS IF ANY ---
      try {
        const closeButton = await page.$(
          'div[aria-label="Close"], div[aria-label="close"], [aria-label="Dismiss"]'
        );
        if (closeButton) {
          await closeButton.click();
          await page.waitForTimeout(2000);
        }
      } catch {}

      // --- EXTRACT EMAILS ---
      const content = await page.content();
      const emails = content.match(emailRegex) || [];
      results.push({ url, emails });

      console.log(`Found ${emails.length} emails at ${url}`);

    } catch (err) {
      console.log(`Error on: ${url}`, err.message);
      results.push({ url, emails: [] });
    }
  }

  await browser.close();

  // --- SAVE LOCALLY ---
  fs.writeFileSync('emails.json', JSON.stringify(results, null, 2));
  console.log('Scraping complete. Results saved in emails.json');
  // --- SEND TO N8N WEBHOOK ---
try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails: results })
  });

  if (response.ok) {
    console.log('Results successfully sent to n8n webhook.');
  } else {
    console.log('Failed to send results to n8n webhook. Status:', response.status);
  }
} catch (err) {
  console.log('Error sending results to n8n webhook:', err.message);
}
})();
