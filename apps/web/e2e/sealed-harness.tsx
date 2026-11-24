import { createRoot } from "react-dom/client";
import { useState } from "react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SealedBuilder } from "@/tournaments/sealed/SealedBuilder";
import { applyDarkMode } from "@/design/darkMode";
import "@/design/tokens.css";
import "@/design/base.css";
import "@/design/layout.css";
import "@/design/primitives.css";

applyDarkMode();
function Harness() {
  const [ready, setReady] = useState(false);
  const id = new URLSearchParams(location.search).get("id")!;
  return (
    <I18nProvider>
      <main style={{ maxWidth: "72rem", margin: "auto", padding: "1rem" }}>
        <SealedBuilder tournamentId={id} onReady={() => setReady(true)} />
        {ready ? <p role="status">Submission accepted</p> : null}
      </main>
    </I18nProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
