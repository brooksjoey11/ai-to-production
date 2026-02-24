#!/usr/bin/env python3
"""
LinkedIn Profile Scraper – Production Version (Reconstructed)
================================================================
A complete, production‑ready tool to scrape profile data from LinkedIn
search results with pagination, error handling, and logging.

Table of Contents
-----------------
1. Prerequisites
2. Dependencies
3. Usage
4. Configuration Constants
5. Logging Setup
6. LinkedInScraper Class
   6.1 __init__
   6.2 quit
   6.3 random_delay
   6.4 safe_get
   6.5 login
   6.6 scroll_to_bottom
   6.7 find_result_items
   6.8 extract_profile_data
   6.9 has_next_page
   6.10 click_next_page
   6.11 scrape_profiles
7. Main Entry Point
8. Verification & Fallback Notes

Prerequisites
-------------
- Python 3.7+
- Google Chrome browser installed
- ChromeDriver executable in PATH (or automatically managed by webdriver-manager)
- Active LinkedIn account credentials
- Internet connection

Dependencies
------------
All required Python packages are listed below. Install with:
    pip install selenium beautifulsoup4 pandas webdriver-manager

- selenium (4.x)
- beautifulsoup4 (4.x)
- pandas (1.x)
- webdriver-manager (optional, for automatic ChromeDriver management)

Usage
-----
Run the script from command line:
    python linkedin_scraper.py --email YOUR_EMAIL --password YOUR_PASSWORD \
        --search-url "https://www.linkedin.com/search/results/people/?keywords=..." \
        [--output leads.csv] [--headless] [--append] [--user-agent "..."]

Arguments:
    --email        LinkedIn account email (required)
    --password     LinkedIn account password (required)
    --search-url   Full LinkedIn search results URL (required)
    --output       Output CSV file (default: leads.csv)
    --headless     Run browser in headless mode (default: False)
    --append       Append to existing CSV instead of overwriting
    --user-agent   Custom User-Agent string (optional)

Verification Steps
------------------
- After login, the script verifies successful authentication by checking for
  the presence of the feed URL or a logged‑in navigation element.
- After each page load, it confirms that search results are present.
- After scraping each page, the number of extracted profiles is logged.
- Final CSV is written and its creation is confirmed.

Fallback / Rollback Procedures
-------------------------------
- If login fails after retries, the script exits with an error.
- If a page fails to load, it retries up to 2 times before aborting.
- If the "Next" button cannot be found or clicked, pagination stops gracefully.
- All critical errors are logged and cause the script to exit with a non‑zero code.

Notes & Technical Warnings
--------------------------
- LinkedIn employs anti‑bot measures; scraping too aggressively may lead to
  account restrictions or IP blocks. Use appropriate delays and consider rotating
  user agents / proxies for large‑scale scraping.
- The CSS selectors used are based on LinkedIn’s current HTML structure (as of 2025).
  LinkedIn frequently updates its UI; if scraping fails, update the selectors.
- Credentials are handled in memory only; avoid hardcoding them in scripts.
- For production use, consider integrating a session‑management system and
  using headless browsers on remote machines.

Next Steps After Execution
--------------------------
- Review the generated CSV for data quality.
- Implement data deduplication if running multiple searches.
- Extend the script to follow profile links and scrape detailed information.
- Add proxy rotation and advanced evasion techniques for large‑scale operations.
"""

import argparse
import logging
import random
import sys
import time
import atexit
from typing import List, Dict, Optional, Tuple

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException,
    ElementClickInterceptedException
)
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup
import pandas as pd

# -------------------- Configuration Constants --------------------
# Random delay ranges (in seconds) to mimic human behavior
MIN_TYPING_DELAY = 0.5
MAX_TYPING_DELAY = 2.5
MIN_PAGE_LOAD_DELAY = 1.0
MAX_PAGE_LOAD_DELAY = 3.0

# Maximum number of pages to scrape (safety limit)
MAX_PAGES = 50

# Default User-Agent (can be overridden via --user-agent)
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# CSS selectors for search results (tried in order until one works)
RESULT_ITEM_SELECTORS = [
    ".entity-result",                          # most common
    ".reusable-search__result-container",       # fallback
    "li.reusable-search__result-container"      # alternative
]

PROFILE_LINK_SELECTOR = "a.app-aware-link"
NAME_SELECTOR = "span.entity-result__title-text"
HEADLINE_SELECTOR = "div.entity-result__primary-subtitle"
LOCATION_SELECTOR = "div.entity-result__secondary-subtitle"

# Element that indicates successful login (e.g., feed page or profile icon)
LOGGED_IN_INDICATOR = (By.CSS_SELECTOR, "a[href='/feed/']")

# -------------------- Logging Setup --------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# -------------------- Scraper Class --------------------
class LinkedInScraper:
    """
    Main scraper class that handles browser automation, login, and data extraction.
    """

    def __init__(self, headless: bool = True, user_agent: Optional[str] = None):
        """
        Initialize Chrome driver with options.

        Args:
            headless: Whether to run browser in headless mode.
            user_agent: Custom User-Agent string; if None, default is used.

        Raises:
            WebDriverException: If ChromeDriver cannot be initialized.
        """
        options = Options()
        if headless:
            options.add_argument("--headless")
        options.add_argument(f"user-agent={user_agent or DEFAULT_USER_AGENT}")
        # Additional options to reduce detection
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            # Attempt to use webdriver-manager if available (optional)
            try:
                from webdriver_manager.chrome import ChromeDriverManager
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=options)
            except ImportError:
                # Fall back to PATH-based ChromeDriver
                self.driver = webdriver.Chrome(options=options)
        except WebDriverException as e:
            logger.error(f"Failed to initialize Chrome driver: {e}")
            logger.error("Ensure ChromeDriver is installed and in PATH, "
                         "or install webdriver-manager for automatic management.")
            raise

        # Register cleanup
        atexit.register(self.quit)

    def quit(self) -> None:
        """Quit the driver safely if it exists."""
        if hasattr(self, "driver"):
            try:
                self.driver.quit()
            except Exception as e:
                logger.error(f"Error while quitting driver: {e}")

    def random_delay(self, min_sec: float = MIN_TYPING_DELAY,
                     max_sec: float = MAX_TYPING_DELAY) -> None:
        """Sleep for a random duration between min_sec and max_sec."""
        time.sleep(random.uniform(min_sec, max_sec))

    def safe_get(self, url: str, retries: int = 2) -> None:
        """
        Navigate to URL with retry logic.

        Args:
            url: The URL to load.
            retries: Number of retry attempts on failure.

        Raises:
            Exception: If all retries fail.
        """
        for attempt in range(retries):
            try:
                self.driver.get(url)
                return
            except Exception as e:
                logger.warning(f"Failed to load {url} (attempt {attempt+1}): {e}")
                if attempt == retries - 1:
                    raise
                self.random_delay(2, 5)

    def login(self, email: str, password: str, retries: int = 2) -> None:
        """
        Log into LinkedIn with retries and verification.

        Args:
            email: LinkedIn account email.
            password: LinkedIn account password.
            retries: Number of login attempts.

        Raises:
            ValueError: If email or password is empty.
            Exception: If login fails after all retries.
        """
        if not email or not password:
            raise ValueError("Email and password must not be empty")

        for attempt in range(retries):
            try:
                logger.info("Navigating to LinkedIn login page")
                self.safe_get("https://www.linkedin.com/login")

                # Wait for email field
                email_field = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.ID, "username"))
                )
                self.random_delay()
                email_field.send_keys(email)

                # Password field
                password_field = self.driver.find_element(By.ID, "password")
                self.random_delay()
                password_field.send_keys(password)

                # Sign-in button
                sign_in_button = self.driver.find_element(
                    By.XPATH, "//button[@type='submit']"
                )
                self.random_delay()
                sign_in_button.click()

                # Wait for either feed (success) or checkpoint/error
                WebDriverWait(self.driver, 15).until(
                    lambda d: "feed" in d.current_url
                              or "checkpoint" in d.current_url
                              or d.find_elements(By.CSS_SELECTOR, ".alert-content")
                )

                # Check for security checkpoint
                if "checkpoint" in self.driver.current_url:
                    logger.error("Login blocked by security checkpoint (CAPTCHA/verification).")
                    raise Exception("LinkedIn security checkpoint encountered")

                # Check for error alerts
                if self.driver.find_elements(By.CSS_SELECTOR, ".alert-content"):
                    logger.error("Login failed: incorrect credentials or account issue")
                    raise Exception("Login failed")

                # Verify we are actually logged in by looking for a feed element
                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located(LOGGED_IN_INDICATOR)
                    )
                except TimeoutException:
                    logger.error("Logged-in indicator not found after login")
                    raise Exception("Post-login verification failed")

                logger.info("Login successful")
                return  # success

            except (TimeoutException, Exception) as e:
                logger.warning(f"Login attempt {attempt+1} failed: {e}")
                if attempt == retries - 1:
                    raise
                self.random_delay(2, 5)  # wait before retry

    def scroll_to_bottom(self) -> None:
        """Scroll to bottom of page to trigger lazy loading."""
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        self.random_delay(1, 2)

    def find_result_items(self, soup: BeautifulSoup) -> List:
        """
        Try multiple selectors to find profile result items.

        Args:
            soup: BeautifulSoup object of the page.

        Returns:
            List of result items (tags).
        """
        for selector in RESULT_ITEM_SELECTORS:
            items = soup.select(selector)
            if items:
                logger.debug(f"Found {len(items)} items using selector: {selector}")
                return items
        return []

    def extract_profile_data(self, item) -> Dict[str, Optional[str]]:
        """
        Extract name, URL, headline, location from a result item.

        Args:
            item: BeautifulSoup tag representing a single search result.

        Returns:
            Dictionary with keys: name, profile_url, headline, location.
        """
        profile = {"name": None, "profile_url": None, "headline": None, "location": None}

        # Profile link and name
        link_tag = item.select_one(PROFILE_LINK_SELECTOR)
        if link_tag:
            profile["profile_url"] = link_tag.get("href")
            name_tag = link_tag.select_one(NAME_SELECTOR)
            if name_tag:
                profile["name"] = name_tag.get_text(strip=True)

        # Headline
        headline_tag = item.select_one(HEADLINE_SELECTOR)
        if headline_tag:
            profile["headline"] = headline_tag.get_text(strip=True)

        # Location
        location_tag = item.select_one(LOCATION_SELECTOR)
        if location_tag:
            profile["location"] = location_tag.get_text(strip=True)

        return profile

    def has_next_page(self) -> bool:
        """
        Check if a 'Next' button exists and is clickable.

        Returns:
            True if next page button exists and is enabled, False otherwise.
        """
        try:
            next_buttons = self.driver.find_elements(
                By.XPATH,
                "//button[@aria-label='Next'] | //button[contains(@class, 'artdeco-pagination__button--next')]"
            )
            if next_buttons and next_buttons[0].is_enabled():
                return True
        except Exception:
            pass
        return False

    def click_next_page(self) -> bool:
        """
        Click the 'Next' button and wait for new results.

        Returns:
            True if navigation succeeded, False otherwise.
        """
        try:
            next_button = self.driver.find_element(
                By.XPATH,
                "//button[@aria-label='Next'] | //button[contains(@class, 'artdeco-pagination__button--next')]"
            )
            # Scroll into view
            ActionChains(self.driver).move_to_element(next_button).perform()
            self.random_delay(0.5, 1.5)
            next_button.click()

            # Wait for old results to become stale (indicating page change)
            WebDriverWait(self.driver, 10).until(
                EC.staleness_of(next_button)
            )
            # Wait for new results to appear
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, RESULT_ITEM_SELECTORS[0]))
            )
            self.random_delay(1, 2)  # extra buffer
            return True
        except (NoSuchElementException, TimeoutException, ElementClickInterceptedException) as e:
            logger.debug(f"No next page or click failed: {e}")
            return False

    def scrape_profiles(self, search_url: str, output_file: str = "leads.csv",
                        write_mode: str = "w") -> None:
        """
        Scrape profile data from all pages of LinkedIn search results.

        Args:
            search_url: The LinkedIn search results URL to start from.
            output_file: Path to the output CSV file.
            write_mode: File write mode ('w' for overwrite, 'a' for append).

        Raises:
            ValueError: If search_url is empty.
            Exception: If initial results do not load.
        """
        if not search_url:
            raise ValueError("Search URL must not be empty")

        logger.info(f"Navigating to search URL: {search_url}")
        self.safe_get(search_url)

        # Wait for initial results
        try:
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, RESULT_ITEM_SELECTORS[0]))
            )
        except TimeoutException:
            logger.error("Search results did not load within timeout")
            self.driver.save_screenshot("timeout.png")
            raise

        self.random_delay(MIN_PAGE_LOAD_DELAY, MAX_PAGE_LOAD_DELAY)
        self.scroll_to_bottom()  # trigger any lazy loading

        all_profiles = []
        page_num = 1

        while page_num <= MAX_PAGES:
            logger.info(f"Scraping page {page_num}...")

            # Parse current page
            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            result_items = self.find_result_items(soup)

            if not result_items:
                logger.warning("No profile results found on this page. Stopping.")
                break

            page_profiles = []
            for item in result_items:
                profile = self.extract_profile_data(item)
                if profile["name"] or profile["profile_url"]:
                    page_profiles.append(profile)
                else:
                    logger.debug("Skipping empty profile item")

            logger.info(f"Found {len(page_profiles)} profiles on page {page_num}")
            all_profiles.extend(page_profiles)

            # Check for next page
            if not self.has_next_page():
                logger.info("No more pages available.")
                break

            if not self.click_next_page():
                logger.info("Could not navigate to next page. Stopping.")
                break

            page_num += 1

        logger.info(f"Total profiles scraped: {len(all_profiles)}")

        # Save to CSV
        if all_profiles:
            df = pd.DataFrame(all_profiles)
        else:
            # Create empty DataFrame with correct columns
            df = pd.DataFrame(columns=["name", "profile_url", "headline", "location"])

        try:
            df.to_csv(output_file, index=False, mode=write_mode)
            logger.info(f"Data saved to {output_file}")
        except Exception as e:
            logger.error(f"Failed to write CSV: {e}")
            raise

# -------------------- Main Entry Point --------------------
def main() -> None:
    """Parse command-line arguments and orchestrate the scraping process."""
    parser = argparse.ArgumentParser(
        description="LinkedIn profile scraper with pagination (production version)"
    )
    parser.add_argument("--email", required=True, help="LinkedIn account email")
    parser.add_argument("--password", required=True, help="LinkedIn account password")
    parser.add_argument("--search-url", required=True, help="LinkedIn search results URL")
    parser.add_argument("--output", default="leads.csv", help="Output CSV file (default: leads.csv)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--append", action="store_true", help="Append to existing CSV instead of overwriting")
    parser.add_argument("--user-agent", help="Custom User-Agent string (optional)")

    args = parser.parse_args()
    write_mode = "a" if args.append else "w"

    scraper = None
    try:
        scraper = LinkedInScraper(headless=args.headless, user_agent=args.user_agent)
        scraper.login(args.email, args.password)
        scraper.scrape_profiles(args.search_url, args.output, write_mode)
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        sys.exit(1)
    finally:
        if scraper:
            scraper.quit()

    logger.info("Scraping completed successfully")

if __name__ == "__main__":
    main()