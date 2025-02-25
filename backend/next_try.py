import time
import requests
from dotenv import load_dotenv, find_dotenv
import os
a = find_dotenv()
load_dotenv(find_dotenv())

# LinkedIn API Credentials
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")

from linkedin_api.clients.restli.client import RestliClient

restli_client = RestliClient()

response = restli_client.get(
  resource_path="/userinfo",
  access_token=ACCESS_TOKEN
)
print(response.entity)