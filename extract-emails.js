import fs from 'fs';
import puppeteer from 'puppeteer';

const links = JSON.parse(fs.readFileSync('links.json', 'utf-8'));
const results = [];

const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();

for (const url of links) {
  try {
    console.log("Checking:", url);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const content = await page.content();
    const match = content.match(emailRegex);

    if (match) {
      results.push({
        url,
        email: match[0].toLowerCase()
      });
    }

  } catch (error) {
    console.log("Error on:", url);
  }
}

await browser.close();

fs.writeFileSync('emails.json', JSON.stringify(results, null, 2));
console.log("Done.");
