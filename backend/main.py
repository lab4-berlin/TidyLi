import csv
import os
import time
import pickle
import random
import requests
import undetected_chromedriver as uc  # Use undetected ChromeDriver
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import ssl
import certifi

ssl._create_default_https_context = ssl._create_unverified_context

def get_free_proxies():
    try:
        url = "https://www.proxy-list.download/api/v1/get?type=http"
        response = requests.get(url)
        proxies = response.text.strip().split("\r\n")
        return proxies[:10]  # Get first 10 proxies
    except Exception as e:
        print(f"Error fetching proxies: {e}")
        return []


PROXY_LIST = get_free_proxies()


def get_random_proxy():
    return random.choice(PROXY_LIST) if PROXY_LIST else None


def close_login_overlay(driver):
    """Closes the LinkedIn login overlay if present."""
    try:
        time.sleep(random.uniform(3, 6))
        close_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'artdeco-dismiss')]"))
        )
        close_button.click()
        time.sleep(random.uniform(2, 4))
    except Exception:
        print("No login overlay detected or already removed.")


def get_profile_picture(profile_url, log_in=False, use_proxy=False, visible_browser=False, max_retries=3):
    options = webdriver.ChromeOptions()
    if not visible_browser:
        options.add_argument("--headless=new")

    if use_proxy and PROXY_LIST:
        proxy_address = get_random_proxy()
        options.add_argument(f"--proxy-server={proxy_address}")

    for attempt in range(max_retries):
        driver = uc.Chrome(options=options, use_subprocess=True)  # Use undetected ChromeDriver
        try:
            if log_in:
                driver.get("https://www.linkedin.com")
                time.sleep(random.uniform(5, 10))
                cookies_path = "linkedin_cookies.pkl"
                if os.path.exists(cookies_path):
                    cookies = pickle.load(open(cookies_path, "rb"))
                    for cookie in cookies:
                        driver.add_cookie(cookie)
                        time.sleep(random.uniform(0.5, 2))
                else:
                    print("No cookies file found! Please log in manually and save cookies.")
                    driver.quit()
                    return None

            print(f"Opening profile page: {profile_url}")
            driver.get(profile_url)
            time.sleep(random.uniform(5, 10))
            print(f"Current page title: {driver.title}")

            if not log_in:
                close_login_overlay(driver)
                if "login" in driver.current_url:
                    print("Redirected to login page! LinkedIn is blocking access without login.")
                    return None

            selector = 'img.presence-entity__image, img.pv-top-card-profile-picture__image'
            picture_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            picture_url = picture_element.get_attribute('src')
            return picture_url

        except Exception as e:
            print(f"Error retrieving picture for {profile_url}: {e} (Attempt {attempt + 1}/{max_retries})")
            time.sleep(2 ** attempt + random.uniform(1, 3))
        finally:
            driver.quit()

    print(f"Skipping {profile_url} after {max_retries} failed attempts.")
    return None


def load_existing_pictures(pictures_csv_path):
    existing_pictures = set()
    if os.path.exists(pictures_csv_path):
        with open(pictures_csv_path, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                if row:
                    existing_pictures.add(row[0])
    return existing_pictures


def main():
    profiles_csv_path = "../data/connections.csv"
    pictures_csv_path = "../data/pictures.csv"

    processed_profiles = load_existing_pictures(pictures_csv_path)

    with open(profiles_csv_path, mode="r", newline="", encoding="utf-8") as f_profiles, \
            open(pictures_csv_path, mode="a", newline="", encoding="utf-8") as f_pictures:

        reader = csv.reader(f_profiles)
        writer = csv.writer(f_pictures)

        if os.stat(pictures_csv_path).st_size == 0:
            writer.writerow(["profile_url", "profile_picture_url"])

        next(reader, None)

        for row in reader:
            if len(row) < 3:
                continue

            profile_url = row[2]
            if not profile_url or profile_url in processed_profiles:
                continue

            print(f"Processing {profile_url}...")
            time.sleep(random.uniform(3, 8))

            profile_url="https://www.linkedin.com/in/andrew-ng-1b1a0a/"
            profile_picture_url = get_profile_picture(profile_url, False, False, True)
            if profile_picture_url:
                writer.writerow([profile_url, profile_picture_url])
                f_pictures.flush()
                print(f"Saved: {profile_picture_url}")

            sleep_time = round(random.uniform(5, 15), 2)
            print(f"Sleeping for {sleep_time} seconds\n")
            time.sleep(sleep_time)

    print(f"Processing complete. Results saved in {pictures_csv_path}")


if __name__ == "__main__":
    main()