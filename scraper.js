const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;
const apiKey = '8f929aaad5ca56e5681210941ce15669';

const chromeOptions = {
  headless: false,
  defaultViewport: null,
  slowMo: 10
};

const siteDetails = {
  sitekey: '6Lcj-R8TAAAAABs3FrRPuQhLMbp5QrHsHufzLf7b',
  pageurl: 'https://www.zillow.com',
  slowMo: 10
};

/* The captcha bypassing logic */
async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    googlekey: siteDetails.sitekey,
    key: apiKey,
    pageurl: siteDetails.pageurl,
    json: 1
  };
  const response = await request.post('http://2captcha.com/in.php', {form: formData});
  return JSON.parse(response).request;
}

async function pollForRequestResults(key, id, retries = 30, interval = 1500, delay = 15000) {
  await timeout(delay);
  return poll({
    taskFn: requestCaptchaResults(key, id),
    interval,
    retries
  });
}

function requestCaptchaResults(apiKey, requestId) {
  const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
  return async function() {
      return new Promise(async function(resolve, reject){
      const rawResponse = await request.get(url);
      const resp = JSON.parse(rawResponse);
      if (resp.status === 0) return reject(resp.request);
      resolve(resp.request);
      });
  }
}

const timeout = millis => new Promise(resolve => setTimeout(resolve, millis));

/* The scraper */
async function scrape(zip) {

  const browser = await puppeteer.launch(chromeOptions);

  const page = await browser.newPage();

  await page.goto('https://www.zillow.com');
  
  /* Checks to see if the captcha element exists */
  let captchaTriggered = !!(await page.$("g-recaptcha-response"));

  if (captchaTriggered) {

    const requestId = await initiateCaptchaRequest(apiKey);
  
    const response = await pollForRequestResults(apiKey, requestId);
  
    await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);

  };

  await page.type('input', zip);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.ListingButtons__TextButton-sc-8yz792-2');
  await page.click('.ListingButtons__TextButton-sc-8yz792-2');

};

scrape('80301');

document.querySelector('.ds-bed-bath-living-area-container').innerText