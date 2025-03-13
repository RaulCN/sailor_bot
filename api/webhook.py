from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs
from .utils import carregar_reunioes, salvar_reunioes

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        # Parse do formato de form data do Twilio
        data = parse_qs(post_data)
        
        # Extrair os dados relevantes
        numero_telefone = data.get('From', [''])[0].replace('whatsapp:', '')
        mensagem = data.get('Body', [''])[0].upper()
        
        # Processa a resposta
        resposta = "Recebemos sua resposta. Obrigado!"
        
        if mensagem == 'SIM':
            reunioes = carregar_reunioes()
            for reuniao in reunioes:
                if reuniao["status"] == "lembrete_enviado" and numero_telefone in reuniao["participantes"]:
                    reuniao["confirmacoes"][numero_telefone] = True
                    resposta = f"Presença confirmada para a reunião '{reuniao['titulo']}'."
            salvar_reunioes(reunioes)
        
        # Enviar resposta
        self.send_response(200)
        self.send_header('Content-type', 'text/xml')
        self.end_headers()
        
        # Responder no formato TwiML
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Message>{resposta}</Message>
        </Response>
        """
        self.wfile.write(twiml_response.encode())
