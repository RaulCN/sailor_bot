from http.server import BaseHTTPRequestHandler
import json
from .utils import carregar_reunioes, salvar_reunioes

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # Extrair dados da requisição
        titulo = data.get("titulo")
        data_hora = data.get("data_hora")
        participantes = data.get("participantes")
        
        # Verificar se todos os dados necessários foram fornecidos
        if not all([titulo, data_hora, participantes]):
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Dados incompletos"}).encode())
            return
            
        # Agendar reunião
        reunioes = carregar_reunioes()
        reuniao = {
            "titulo": titulo,
            "data_hora": data_hora,
            "participantes": participantes,
            "confirmacoes": {},
            "status": "agendada"
        }
        reunioes.append(reuniao)
        salvar_reunioes(reunioes)
        
        # Enviar resposta
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": f"Reunião '{titulo}' agendada para {data_hora}"}).encode())
