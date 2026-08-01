# bot.py

# Import libraries
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, CallbackContext
from response_map import response_map  # Import centralized response map
import subprocess
import os
import time
import logging
import json
from collections import Counter
from datetime import datetime
import random

# Bot and Wit.ai tokens
TOKEN = '7275982316:AAFWpmHPVCKvj_GqHEYAJ0ZIHfvtXyoQI5U'
WIT_AI_TOKEN = 'LOAVMKSQGWLSRS3IJHSEZDG3U63P2RGS'
WIT_API_URL = "https://api.wit.ai"
# File path
FAQ_LOG_FILE = "faq_questions.txt"
FALLBACK_LOG_FILE = "fallback_questions.txt"

# Counter untuk tracking sementara dalam runtime
faq_counter = Counter()

def log_faq_question(intent, entity):
    key = (intent, entity if entity else "-")
    faq_counter[key] += 1

    save_faq_log_to_file()

def save_faq_log_to_file():
    """Simpan counter FAQ dalam format JSON agar bisa digunakan untuk chart."""
    data = []
    for (intent, entity), count in faq_counter.items():
        data.append({
            "intent": intent,
            "entity": entity,
            "count": count
        })
    with open(FAQ_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_faq_log_from_file():
    """Muat isi log jika sudah pernah ada sebelumnya."""
    global faq_counter
    if not os.path.exists(FAQ_LOG_FILE):
        return

    with open(FAQ_LOG_FILE, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            for item in data:
                key = (item.get("intent"), item.get("entity"))
                count = item.get("count", 0)
                faq_counter[key] = count
        except json.JSONDecodeError:
            print("Format JSON tidak valid pada file log.")

def log_fallback_question(question, fallback_response):
    """Log pertanyaan fallback ke file JSON."""
    fallback_entry = {
        "question": question,
        "fallback_response": fallback_response
    }

    # Jika file belum ada, buat array baru
    if not os.path.exists(FALLBACK_LOG_FILE):
        with open(FALLBACK_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump([fallback_entry], f, ensure_ascii=False, indent=2)
    else:
        with open(FALLBACK_LOG_FILE, "r+", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
            data.append(fallback_entry)
            f.seek(0)
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.truncate()

# Function to start the Flask backend
def start_flask():
    try:
        flask_process = subprocess.Popen(
            ["py", "app.py"],  # Command to run React
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )
        print("Flask started.")
        return flask_process
    except Exception as e:
        print(f"Error starting Flask: {e}")
        return None

# Function to start the React frontend
def start_react():
    # Navigate to the React app directory
    react_dir = os.path.join(os.getcwd(), "bot-management")

    try:
        react_process = subprocess.Popen(
            ["npm", "start"],  # Command to run React
            cwd=react_dir,  # Run the command in the React app directory
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,  # Use shell=True for Windows
        )
        print("React frontend started.")
        return react_process
    except Exception as e:
        print(f"Error starting React frontend: {e}")
        return None

# Load response map from JSON file
def load_response_map():
    try:
        from response_map import response_map
        return response_map
    except ImportError:
        print("response_map.py tidak ditemukan atau tidak ada variabel 'response_map'.")
        return {}

# Save response map to JSON file
def save_response_map(data):
    with open('response_map.py', 'w') as file:
        file.write('response_map = ')
        json.dump(data, file, indent=2)

# Get intents from Wit.ai
def get_wit_intents():
    headers = {"Authorization": f"Bearer {WIT_AI_TOKEN}"}
    response = requests.get(f"{WIT_API_URL}/intents", headers=headers)
    if response.status_code == 200:
        return [intent['name'] for intent in response.json()]
    else:
        print("Failed to fetch intents from Wit.ai:", response.status_code)
        return []

def get_entities_per_intent():
    headers = {
        "Authorization": f"Bearer {WIT_AI_TOKEN}",
        "Content-Type": "application/json"
    }

    # Ambil semua intent
    intents_response = requests.get(f"{WIT_API_URL}/intents?v=20200513", headers=headers)
    if intents_response.status_code != 200:
        print("Gagal mengambil daftar intents:", intents_response.status_code)
        return {}

    intents = intents_response.json()
    intent_entity_map = {}


    for intent in intents:
        name = intent.get("name")
        url = f"{WIT_API_URL}/intents/{name}?v=20200513"
        r = requests.get(url, headers=headers)

        if r.status_code != 200:
            print(f"Gagal mengambil detail intent '{name}':", r.status_code)
            continue

        data = r.json()

        entity_set = set()
        for ent in data.get("entities", []):
            entity_name = ent.get("name")
            if entity_name:
                entity_set.add(entity_name.split(":")[-1])  # hilangkan prefix sebelum ":" jika ada

        intent_entity_map[name] = list(entity_set)

    return intent_entity_map

# Sync response map with intents from Wit.ai
def sync_response_map_with_wit():
    current_map = load_response_map()
    intents = get_wit_intents()  # Ini sekarang list of strings
    intent_entities = get_entities_per_intent()

    for intent in intents:
        intent_name = intent  # Gantilah ini!
        
        if intent_name not in current_map:
            current_map[intent_name] = {
                "default": f"Belum ada jawaban untuk intent '{intent_name}'.",
                "entities": {},
                "data": {}
            }

        expressions_url = f"{WIT_API_URL}/utterances?v=20230525&limit=1000"
        expressions = requests.get(
            expressions_url,
            headers={
                'Authorization': f'Bearer {WIT_AI_TOKEN}',
            }
        ).json()

        for exp in expressions:
            if exp.get("intent") == intent_name:
                print(json.dumps(exp, indent=2))

        # Hanya entitas yang digunakan dalam intent tersebut
        entities = intent_entities.get(intent_name, [])
        for ent in entities:
            if ent not in current_map[intent_name]["entities"]:
                current_map[intent_name]["entities"][ent] = f"Data untuk entity '{ent}' belum tersedia."

    save_response_map(current_map)
    return current_map

# Sync response map at startup
response_map = sync_response_map_with_wit()

# Start command handler
async def start(update: Update, context):
    await update.message.reply_text("Halo! Selamat Datang. Informasi Seputaran Kuliah Apa Yang Ingin Anda Tanyakan?")

# Function to call Wit.ai API
def get_wit_response(user_message):
    url = 'https://api.wit.ai/message'
    headers = {
        'Authorization': f'Bearer {WIT_AI_TOKEN}',
    }
    params = {'q': user_message}
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        wit_response = response.json()
        print("Wit.ai Response:", wit_response)  # Log Wit.ai response
        return wit_response
    else:
        print("Wit.ai Error:", response.status_code, response.text)  # Log error details
        return None

# Configure logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def handle_message(update: Update, context):
    user_id = update.message.chat_id
    user_message = update.message.text

    if "context" not in context.user_data:
        context.user_data["context"] = {}

    user_context = context.user_data["context"]

    # Get response from Wit.ai
    wit_response = get_wit_response(user_message)
    logging.info(f"Wit.ai Response: {wit_response}")

    if wit_response:
        intent = wit_response['intents'][0]['name'] if wit_response['intents'] else "unknown"
        raw_entities = wit_response.get('entities', {})

        entities = {}
        for key, values in raw_entities.items():
            entitiy_type = key.split(':')[-1]

            #karna biasanya wit.ai p response ja kase lebih dari 1 respon for 1 pertanyaan, jadi trg pilih respon dengan nilai confidence tinggi (kemungkinan pertanyaan terbesar)
            best_value = max(values, key=lambda x: x.get('confidence', 0))
            entities[entitiy_type] = best_value['value']

        user_context["last_intent"] = intent
        user_context["last_entities"] = entities

        logging.info(f"Extracted intent: {intent}")
        logging.info(f"Extracted entities: {entities}")

        entityToStore=''
        if intent in response_map:
            intent_data = response_map[intent]
            default_responses = intent_data.get("default", "Maaf, saya belum memiliki informasi yang diminta.")
            if isinstance(default_responses, list):
                reply = random.choice(default_responses) #pilih random dari default respon tiap intent
            else:
                reply = default_responses

            found_entity = False

            if "entities" in intent_data and entities:
                for entity, response_template in intent_data["entities"].items():
                    if entity in entities:
                        entityToStore=entity
                        value = entities[entity].strip().lower()

                        data_map={k.lower(): v for k, v in intent_data.get("data", {}).items()}

                        # Extract entity-specific data from response_map
                        entity_value = data_map.get(value, "tidak tersedia")

                        # Check if response_template is a list of array
                        if isinstance(response_template, list) and response_template:  
                            selected_template = random.choice(response_template)
                        elif isinstance(response_template, str):
                            selected_template = response_template
                        else:
                            selected_template = response_template# Fallback: use intent name

                        #attempt formatting
                        try:
                            if entity_value != "tidak tersedia":
                                if intent == "jadwal_ujian":
                                    reply = selected_template.format(jalur=entities[entity], jadwal_ujian=entity_value)
                                    found_entity = True
                                elif intent == "Kontak":
                                    reply = selected_template.format(kontak=entity_value)
                                    found_entity = True
                                elif intent == "akreditasi_prodi":
                                    reply = selected_template.format(jurusan=entities[entity], akreditasi_prodi=entity_value)
                                    found_entity = True
                                elif intent == "kuota_prodi":
                                    reply = selected_template.format(jurusan=entities[entity], kuota_prodi=entity_value)
                                    found_entity = True
                                elif intent == "alur_pendaftaran":
                                    reply = selected_template.format(alur_pendaftaran=entity_value)
                                    found_entity = True
                                elif intent == "jajaran_unsrat":
                                    reply = selected_template.format(rektor=entity_value)
                                    found_entity = True
                                else:
                                    reply = selected_template
                                    found_entity = True
                                     # fallback
                            else:
                                reply = f"Data untuk {intent} {entities[entity]} belum tersedia."
                                log_fallback_question(user_message, reply)
                        except Exception as e:
                            reply = "Terjadi kesalahan saat memfromat respons."
                            print("Formatting error: ", e)

                        break  # Stop after finding the first match
            
            if not found_entity:
                reply = random.choice(default_responses)
        else:
            reply = "Maaf, untuk pertanyaan yang Kamu tanyakan saat ini Chatbot masih belum bisa menjawabnya. Untuk informasi lebih lanjut kamu dapat menghubungi operator kami (0431)863886 - (0431)863786"
            log_fallback_question(user_message, reply)

        logging.info(f"Bot reply: {reply}")
        log_faq_question(intent, entityToStore)
        await update.message.reply_text(reply)

    else:
        await update.message.reply_text("Terjadi kesalahan saat memproses permintaan Anda.")

# Main function to start the bot
if __name__ == '__main__':
    # Start Flask backend
    flask_process = start_flask()

    # Start React frontend
    react_process = start_react()

    # Give some time for Flask and React to start
    time.sleep(5)

    # Start the bot
    app = ApplicationBuilder().token(TOKEN).build()

    # Command handler
    app.add_handler(CommandHandler('start', start))

    #open faq file
    faq_file=load_faq_log_from_file()

    # Message handler for all messages
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Bot is running...")
    app.run_polling()