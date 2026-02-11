const chrome = require("selenium-webdriver/chrome");

/**
 * Returns a standardized set of Chrome options for Selenium WebDriver
 * to ensure reliable headless operation and avoid session errors.
 */
function getChromeOptions() {
    const options = new chrome.Options();
    options.addArguments(
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--remote-debugging-port=9222",
        "--disable-software-rasterizer",
        "--window-size=1920,1080"
    );
    return options;
}

module.exports = { getChromeOptions };
