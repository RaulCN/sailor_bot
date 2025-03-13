from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
import json
from .utils import carregar_reunioes, salvar_reunioes, client, TWILIO_WHATSAPP_NUMBER

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        reunioes = carregar_reunioes()
        agora = datetime.now()
        lembretes_enviados = 0
        
        for reuniao in reunioes:
            data_hora = datetime.strptime(reuniao["data_hora"], "%Y-%m-%d %H:%M")
            if data_hora - agora <= timedelta(hours=1) and reuniao["status"] == "agendada":
                for participante in reuniao["participantes"]:
                    mensagem = f"Lembrete: Reunião '{reuniao['titulo']}' às {data_hora.strftime('%H:%M')}. Confirme presença respondendo 'SIM'."
                    try:
                        client.messages.create(
                            body=mensagem,
                            from_=f"whatsapp:{TWILIO_WHATSAPP_NUMBER}",
                            to=f"whatsapp:{participante}"
                        )
                    except Exception as e:
                        print(f"Erro ao enviar mensagem: {str(e)}")
                
                reuniao["status"] = "lembrete_enviado"
                lembretes_enviados += 1
                
        salvar_reunioes(reunioes)
        
        # Enviar resposta
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": f"{lembretes_enviados} lembretes enviados"}).encode())
