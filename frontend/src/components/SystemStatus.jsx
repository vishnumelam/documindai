import {
  Activity,
  Database,
  Cpu,
  Server,
} from "lucide-react";

function SystemStatus({ health }) {

  const services = [
    {
      name: "FastAPI",
      icon: Server,
      status:
        health?.services?.fastapi?.status,
    },
    {
      name: "Qdrant",
      icon: Database,
      status:
        health?.services?.qdrant?.status,
    },
    {
      name: "Ollama",
      icon: Cpu,
      status:
        health?.services?.ollama?.status,
    },
  ];

  return (
    <div className="status-panel">

      <div className="status-header">

        <div>
          <span className="eyebrow">
            SYSTEM
          </span>

          <h3>
            Infrastructure
          </h3>
        </div>

        <Activity size={19} />

      </div>

      <div className="status-list">

        {services.map((service) => {

          const Icon = service.icon;

          const healthy =
            service.status === "healthy";

          return (
            <div
              className="status-row"
              key={service.name}
            >

              <div className="status-service">

                <div className="status-icon">
                  <Icon size={16} />
                </div>

                <span>
                  {service.name}
                </span>

              </div>

              <div className="status-value">

                <span
                  className={`status-dot ${
                    healthy
                      ? "healthy"
                      : "unhealthy"
                  }`}
                />

                {healthy
                  ? "Online"
                  : "Offline"}

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}

export default SystemStatus;