import os
import vertexai
from vertexai.generative_models import GenerativeModel

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account.json"

vertexai.init(
    project="tenxgs-interns-work",
    location="us-central1"
)

model = GenerativeModel("gemini-2.5-flash")

response = model.generate_content(
    "Say hello"
)

print(response.text)