import { DeckArtworkPicker } from "@/screens/DeckArtworkPicker";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useSealedPackOpeningSource } from "@/sealed/useSealedPackOpeningSource";
import { SealedOpening } from "@/sealed/SealedOpening";
import { DeckEditor } from "@/screens/DeckEditor";
import { CardDetailDrawer } from "@/screens/CardDetailDrawer";
import { Dialog } from "@/design/primitives";
import { createBlankDeck } from "@/game/decks";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { applyDarkMode } from "@/design/darkMode";
import "@/design/tokens.css";
import "@/design/base.css";
import "@/design/layout.css";
import "@/design/primitives.css";
import "@/sealed/sealed.css";

const pulls = Array.from({ length: 6 }, (_, index) => ({ cardId: index < 5 ? "BT4-104" : "BT4-009" }));
const mode = new URLSearchParams(location.search).get("mode");
function Harness() {
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState(0);
  const [picker, setPicker] = useState(false);
  const source = useSealedPackOpeningSource({
    configuration: getSealedConfiguration({ setId: "BT4" }),
    packs: pulls.map((pull) => [pull]),
    revision: 0,
    window: "initial",
    deck: null,
    ready: false,
    editable: true,
    deadlineAt: null,
  });
  return (
    <I18nProvider>
      {picker ? (
        <DeckArtworkPicker
          cardId="BT4-104"
          arts={["BT4-104"]}
          count={1}
          onChoose={() => undefined}
          onClose={() => setPicker(false)}
        />
      ) : null}
      <button onClick={() => setActions((count) => count + 1)}>Background action {actions}</button>
      {mode === "builder" && (source.completedAllocation?.length ?? 0) > 0 && !open ? (
        <DeckEditor
          deck={createBlankDeck([], "Red", "Keyboard pool")}
          onSave={() => undefined}
          onClose={() => undefined}
          onNav={() => undefined}
          boundedPool={{
            disabled: false,
            pulls: (source.completedAllocation ?? [])
              .flat()
              .map((card) => ({ cardId: card.cardId, artId: card.artId })),
            footer: <button>Ready deck</button>,
          }}
        />
      ) : (
        <>
          <button onClick={() => setOpen(true)}>Open surface</button>
          {open && (mode === "opening" || mode === "builder") ? (
            <SealedOpening source={source} onClose={() => setOpen(false)} />
          ) : null}
          {open && mode === "ordinary" ? (
            <CardDetailDrawer
              cardId="BT4-104"
              onClose={() => setOpen(false)}
              footer={
                <>
                  <button onClick={() => setPicker(true)}>Inspector action</button>
                  <div style={{ display: "none" }}>
                    <button>Hidden action</button>
                  </div>
                  <button disabled>Disabled action</button>
                </>
              }
            />
          ) : null}
          {open && mode === "dialog" ? (
            <Dialog labelledBy="ordinary-dialog" onClose={() => setOpen(false)}>
              <h2 id="ordinary-dialog">Ordinary dialog</h2>
              <button onClick={() => setOpen(false)}>Close</button>
              <button>Dialog action</button>
            </Dialog>
          ) : null}
        </>
      )}
    </I18nProvider>
  );
}
applyDarkMode();
createRoot(document.getElementById("root")!).render(<Harness />);
