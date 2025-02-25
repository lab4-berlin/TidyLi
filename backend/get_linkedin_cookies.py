import pickle
from selenium import webdriver

options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

driver.get("https://www.linkedin.com/login")

# Wait for manual login (MFA push)
input("Press Enter after completing login...")

# Save cookies
pickle.dump(driver.get_cookies(), open("linkedin_cookies.pkl", "wb"))

print("Cookies saved! Now you can use them in headless mode.")
driver.quit()