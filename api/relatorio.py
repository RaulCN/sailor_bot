from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timedelta
from .utils import carregar_reunioes

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        reunioes = carregar_reunioes()
        agora = datetime.now()
        inicio_semana = agora - timedelta(days=agora.weekday())
        fim_semana = inicio_semana + timedelta(days=6)

        reunioes_semana = [
            r for r in reunioes
            if inicio_semana <= datetime.strptime(r["data_hora"], "%Y-%m-%d %H:%M") <= fim_semana
        ]

        relatorio = {
            "total_reunioes": len(reunioes_semana),
            "reunioes_realizadas": [
                {
                    "titulo": r["titulo"],
                    "data_hora": r["data_hora"],
                    "participantes": len(r["participantes"]),
                    "confirmacoes": sum(1 for c in r["confirmacoes"].values() if c)
                }
                for r in reunioes_semana if r["status"] == "concluida"
            ],
            "reunioes_faltantes": [
                {
                    "titulo": r["titulo"],
                    "data_hora": r["data_hora"],
                    "participantes": len(r["participantes"]),
                    "status": r["status"]
                }
                for r in reunioes_semana if r["status"] != "concluida"
            ],
            "estatisticas": {
                "total_participantes": sum(len(r["participantes"]) for r in reunioes_semana),
                "total_confirmacoes": sum(sum(1 for c in r.get("confirmacoes", {}).values() if c) for r in reunioes_semana),
                "taxa_presenca": round(
                    sum(sum(1 for c in r.get("confirmacoes", {}).values() if c) for r in reunioes_semana) /
                    max(1, sum(len(r["participantes"]) for r in reunioes_semana)) * 100, 2
                )
            }
        }
        
        # Enviar resposta
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(relatorio, indent=2).encode())
