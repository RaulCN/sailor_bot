from http.server import BaseHTTPRequestHandler
import json
from .utils import carregar_reunioes, salvar_reunioes

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        reunioes = carregar_reunioes()
        reunioes_processadas = 0
        
        for reuniao in reunioes:
            if reuniao["status"] == "lembrete_enviado":
                # Verificar se todas as confirmações foram processadas
                confirmacoes_completas = True
                for participante in reuniao["participantes"]:
                    if participante not in reuniao["confirmacoes"]:
                        confirmacoes_completas = False
                
                if confirmacoes_completas:
                    reuniao["status"] = "concluida"
                    reunioes_processadas += 1
        
        salvar_reunioes(reunioes)
        
        # Enviar resposta
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": f"{reunioes_processadas} reuniões processadas"}).encode())
