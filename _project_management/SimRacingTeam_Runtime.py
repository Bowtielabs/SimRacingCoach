import threading
import queue
import time
import random
import sys

# --- AGENT FRAMEWORK ---

class Agent(threading.Thread):
    def __init__(self, id, role, instructions, color_code="\033[0m"):
        super().__init__()
        self.agent_id = id
        self.role = role
        self.instructions = instructions
        self.in_queue = queue.Queue()
        self.running = True
        self.color = color_code
        self.daemon = True # Daemon threads exit when main program exits

    def run(self):
        while self.running:
            try:
                # Block until a message is received (timeout allows check for stop)
                message = self.in_queue.get(timeout=1.0)
                if message:
                    self.process_message(message)
                    self.in_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"{self.color}[ERROR] {self.agent_id} crashed: {e}\033[0m")

    def process_message(self, message):
        sender, content = message
        
        # Simular "Pensamiento"
        # print(f"{self.color}{self.agent_id} (Thinking...)\033[0m")
        time.sleep(0.1) # Reduced for responsiveness
        
        # Generar respuesta (MOCK - En un sistema real aquí llamaría al LLM)
        response = self.generate_mock_response(content)
        
        print(f"\n{self.color}┌── [{self.agent_id} | {self.role}] ──────────────────────────────")
        print(f"│ {response}")
        print(f"└──────────────────────────────────────────────────────────────\033[0m\n")

    def generate_mock_response(self, content):
        # Lógica simple para simular respuestas basadas en el rol
        content_lower = content.lower()
        
        if "status" in content_lower or "reporte" in content_lower:
            return f"Reportando estado nominal. Mi área ({self.role}) está operativa."
        
        if self.agent_id == "viktor_tl":
            if "@" in content:
                try:
                    target = content.split("@")[1].split(" ")[0].strip()
                    return f"Entendido. Delegando tarea a @{target}. (Generación detenida)"
                except:
                   return "No pude identificar el agente."
            return "Analizando requerimiento. ¿A quién debo asignar esto?"

    # ... (rest of methods) ...


    def send(self, message, sender="User"):
        self.in_queue.put((sender, message))


class AgentManager:
    def __init__(self, leader):
        self.agents = {}
        self.leader = leader
        self.register_agent(leader)
        
        # Register initial team members if any
        if hasattr(leader, 'team'):
            for member in leader.team:
                self.register_agent(member)

    def register_agent(self, agent):
        self.agents[agent.agent_id] = agent
        if not agent.is_alive():
            agent.start()
        print(f"✅ Agente registrado y activo: {agent.agent_id}")

    def dispatch(self, user_input):
        print(f"DEBUG: Dispatching '{user_input}'")
        # Check if direct mention
        parts = user_input.split()
        target_agent = None
        
        for part in parts:
            if part.startswith("@"):
                potential_id = part[1:]
                # Try partial match
                for agent_id in self.agents:
                    if potential_id.lower() in agent_id.lower():
                        target_agent = self.agents[agent_id]
                        break
        
        if target_agent:
            print(f"DEBUG: Routing to {target_agent.agent_id}")
            target_agent.send(user_input)
        else:
            print(f"DEBUG: Routing to LEADER {self.leader.agent_id}")
            # Default to leader
            self.leader.send(user_input)

# --- DEFINICIÓN DE EQUIPO ---

# Colores ANSI
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
WHITE = "\033[97m"

sofi_ux = Agent(
    id="sofi_ux",
    role="Senior UX/UI Designer",
    instructions="Diseño visual y de experiencia para simuladores.",
    color_code=MAGENTA
)

marcos_front = Agent(
    id="marcos_front",
    role="Senior Frontend Developer",
    instructions="Experto en Electron e interfaces responsivas.",
    color_code=BLUE
)

elena_back = Agent(
    id="elena_back",
    role="Senior Backend Developer",
    instructions="Experta en Node.js y lógica de telemetría.",
    color_code=GREEN
)

lucas_qa = Agent(
    id="lucas_qa",
    role="Senior QA Engineer",
    instructions="Guardián de la calidad. Testea bugs.",
    color_code=RED
)

alex_devops = Agent(
    id="alex_devops",
    role="Senior DevOps Engineer",
    instructions="Infraestructura y empaquetado .exe.",
    color_code=YELLOW
)

clara_doc = Agent(
    id="clara_doc",
    role="Senior Technical Documenter",
    instructions="Documentación técnica y manuales.",
    color_code=CYAN
)

viktor_tl = Agent(
    id="viktor_tl",
    role="Technical Team Lead",
    instructions="Gestor de procesos. Delega usando @nombre_agente.",
    color_code=WHITE
)
# Patching 'team' attribute manually since Agent class is generic
viktor_tl.team = [sofi_ux, marcos_front, elena_back, lucas_qa, alex_devops, clara_doc]

# --- MAIN LOOP ---

if __name__ == "__main__":
    manager = AgentManager(leader=viktor_tl)
    
    print("\n" + "="*60)
    print("🚀 SISTEMA DE AGENTES SIMRACING TEAM (RUNTIME) INICIADO")
    print("="*60)
    print("Escribe tu mensaje para el equipo.")
    print("Usa '@nombre' para hablar con alguien específico.")
    print("Escribe 'exit' para salir.\n")

    try:
        while True:
            user_input = input(f"{WHITE}User > \033[0m")
            if user_input.lower() in ["exit", "quit", "salir"]:
                print("Apagando sistema de agentes...")
                break
            
            manager.dispatch(user_input)
            
            # Tiny sleep to let threads pick up
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        print("\n\nInterrupción detectada. Cerrando.")
        sys.exit(0)
