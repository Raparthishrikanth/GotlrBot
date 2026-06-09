import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load env
load_dotenv('../../.env')
api_key = os.getenv('GEMINI_API_KEY')

print(f"Testing Gemini API Key: {api_key[:8]}...{api_key[-4:] if api_key else ''}")

try:
    genai.configure(api_key=api_key)
    print("Listing available models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name} ({m.display_name})")
except Exception as e:
    print(f"\nAPI Call Failed: {e}")
