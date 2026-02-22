import fs from 'fs';
import puppeteer from 'puppeteer';

const links = JSON.parse(fs.readFileSync('links.json', 'utf-8'));
const results = [];

const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox"
  ]
});

const page = await browser.newPage();

for (const url of links) {
  try {
    console.log("Checking:", url);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try closing popup/modal
    try {
      const closeButton = await page.$(
        'div[aria-label="Close"], div[aria-label="close"], [aria-label="Dismiss"]'
      );

      if (closeButton) {
        console.log("Closing popup...");
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.log("No popup detected");
    }

    const content = await page.content();
    const match = content.match(emailRegex);

    if (match) {
      results.push({
        url,
        email: match[0].toLowerCase()
      });
      console.log("Email found:", match[0]);
    } else {
      console.log("No email found on:", url);
    }

  } catch (error) {
    console.log("Error on:", url, error.message);
  }
}

await browser.close();

fs.writeFileSync('emails.json', JSON.stringify(results, null, 2));

console.log("Finished scraping.");
