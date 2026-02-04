from antigravity import Agent, AgentManager
import os

# --- EL EQUIPO (Nativo para el IDE) ---
sofi_ux = Agent(id="sofi_ux", role="Senior UX", instructions="Diseñas en /src/ux")
marcos_front = Agent(id="marcos_front", role="Senior Frontend", instructions="Programas en /src/frontend")
elena_back = Agent(id="elena_back", role="Senior Backend", instructions="Lógica en /src/backend")
lucas_qa = Agent(id="lucas_qa", role="Senior QA", instructions="Filtro final de calidad")
alex_devops = Agent(id="alex_devops", role="Senior DevOps", instructions="Builds y .exe")
clara_doc = Agent(id="clara_doc", role="Documenter", instructions="Manuales en /src/docs")

# --- LÍDER CON PERMISOS DE SISTEMA ---
viktor_tl = Agent(
    id="viktor_tl",
    role="Team Lead",
    instructions="Menciona con @ y detente. Usa el sistema de archivos real.",
    team=[sofi_ux, marcos_front, elena_back, lucas_qa, alex_devops, clara_doc]
)

# --- CONEXIÓN AL KERNEL DEL IDE ---
# Aquí es donde ocurre la magia: 'environment' le da el poder real
manager = AgentManager(
    leader=viktor_tl,
    execution_mode="real",
    environment="native_os" 
)

if __name__ == "__main__":
    print(">>> KERNEL ANTIGRAVITY CONECTADO")
    while True:
        try:
            pedido = input("\nMauro >> ")
            if pedido.lower() in ["exit", "salir"]: break
            
            # El IDE procesará esto usando su propia IA, no el simulador
            manager.run(pedido)
        except Exception as e:
            print(f"Error: {e}")