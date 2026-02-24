from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import pandas as pd
import time
import random

class LinkedInScraper:
    def __init__(self):
        options = Options()
        options.add_argument("--headless")
        options.add_argument("user-agent=Mozilla/5.0 ...")  # some generic UA
        self.driver = webdriver.Chrome(options=options)

    def login(self, email, password):
        self.driver.get("https://www.linkedin.com/login")
        time.sleep(random.uniform(2,5))
        # Fill email/password fields (by ID or XPath)
        # Click submit
        time.sleep(5)  # naive wait

    def scrape_profiles(self, search_url):
        self.driver.get(search_url)
        time.sleep(3)
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        # Find divs with class="entity-result__item" or whatever current class is
        profiles = []
        for item in soup.find_all('div', class_='some-class'):
            name = item.find('span', class_='entity-result__title-text').text.strip()
            # ... more fields
            profiles.append({'name': name, ...})
        df = pd.DataFrame(profiles)
        df.to_csv('leads.csv', index=False)
        print("Scraped successfully!")

# Usage
scraper = LinkedInScraper()
scraper.login("your@email.com", "pass")
scraper.scrape_profiles("https://www.linkedin.com/search/results/people/?keywords=software%20engineer")