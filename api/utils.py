import json
import os
from datetime import datetime, timedelta
from twilio.rest import Client

# Configurações do Twilio
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER")

# Inicializar cliente Twilio
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Usar /tmp para armazenamento temporário no Vercel
REUNIOES_FILE = "/tmp/reunioes.json"

# Carrega ou cria o arquivo de reuniões
def carregar_reunioes():
    if os.path.exists(REUNIOES_FILE):
        with open(REUNIOES_FILE, "r") as f:
            return json.load(f)
    return []

# Salva as reuniões no arquivo
def salvar_reunioes(reunioes):
    with open(REUNIOES_FILE, "w") as f:
        json.dump(reunioes, f, indent=4)
