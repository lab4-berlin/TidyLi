import csv
import os
import time
import pickle
from random import random

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_profile_picture(profile_url, max_retries=3):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    for attempt in range(max_retries):
        driver = webdriver.Chrome(options=options)
        try:
            driver.get("https://www.linkedin.com")

            # Load cookies
            current_dir = os.path.dirname(os.path.abspath(__file__))
            cookies_path = os.path.join(current_dir, "linkedin_cookies.pkl")
            cookies = pickle.load(open(cookies_path, "rb"))
            for cookie in cookies:
                driver.add_cookie(cookie)

            driver.get(profile_url)
            time.sleep(5)

            selector = 'img.presence-entity__image'  # CSS selector for profile picture
            picture_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            picture_url = picture_element.get_attribute('src')
            return picture_url

        except Exception as e:
            print(f"Error retrieving picture for {profile_url}: {e} (Attempt {attempt + 1}/{max_retries})")
            time.sleep(2)  # Short delay before retry
        finally:
            driver.quit()

    print(f"Skipping {profile_url} after {max_retries} failed attempts.")
    return None  # Return None if all attempts fail

def load_existing_pictures(pictures_csv_path):
    """Load already processed profile URLs to avoid duplicates."""
    existing_pictures = set()
    if os.path.exists(pictures_csv_path):
        with open(pictures_csv_path, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)  # Skip header if present
            for row in reader:
                if row:
                    existing_pictures.add(row[0])
    return existing_pictures

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    profiles_csv_path = os.path.join(current_dir, "../data/connections.csv")
    pictures_csv_path = os.path.join(current_dir, "../data/pictures.csv")

    # Load existing profile URLs to avoid re-processing
    processed_profiles = load_existing_pictures(pictures_csv_path)

    with open(profiles_csv_path, mode="r", newline="", encoding="utf-8") as f_profiles, \
         open(pictures_csv_path, mode="a", newline="", encoding="utf-8") as f_pictures:

        reader = csv.reader(f_profiles)
        writer = csv.writer(f_pictures)

        # If the file is empty, write the header
        if os.stat(pictures_csv_path).st_size == 0:
            writer.writerow(["profile_url", "profile_picture_url"])

        next(reader, None)  # Skip header

        for row in reader:
            if len(row) < 3:
                continue  # Skip malformed rows

            profile_url = row[2]

            if profile_url in processed_profiles:
                print(f"Skipping {profile_url}, already processed.")
                continue

            print(f"Processing {profile_url}...")

            profile_picture_url = get_profile_picture(profile_url)
            if profile_picture_url:
                writer.writerow([profile_url, profile_picture_url])
                f_pictures.flush()  # Ensure data is written immediately
                print(f"Saved: {profile_picture_url}")

            sleep_time = round(random() * 3, 2)
            print(f"Sleeping for {sleep_time} seconds\n")
            time.sleep(sleep_time)

    print(f"Processing complete. Results saved in {pictures_csv_path}")

if __name__ == "__main__":
    main()