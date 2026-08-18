import { createRoot } from "react-dom/client";
import { App } from "./App";
import { synchronizeDeploymentRevision, usesSlotDeploymentRouter } from "./net/deployment";
import "./design/tokens.css";
import "./design/base.css";
import "./design/layout.css";
import "./design/primitives.css";

async function start(): Promise<void> {
  if (usesSlotDeploymentRouter({
    production: import.meta.env.PROD,
    deploymentMode: import.meta.env.VITE_AEGIS_DEPLOYMENT_MODE,
  })) {
    try {
      const current = await synchronizeDeploymentRevision({
        bundleRevision: import.meta.env.VITE_AEGIS_REVISION,
        navigation: window.location,
      });
      if (!current) return;
    } catch {
      // A transient manifest failure must not turn the whole site into a blank page.
      // Room connection handling will surface a useful error if the API is also down.
    }
  }

  const container = document.getElementById("root");
  if (!container) throw new Error("#root not found");
  createRoot(container).render(<App />);
}

void start();
