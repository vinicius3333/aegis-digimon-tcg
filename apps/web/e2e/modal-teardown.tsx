import { useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { Dialog } from "@/design/primitives";
import "@/design/tokens.css";
import "@/design/base.css";
import "@/design/primitives.css";

const portalled = new URLSearchParams(location.search).has("portal");
function RenderParent({ onClose }: { onClose: () => void }) {
  const [child, setChild] = useState(false);
  const nested = child ? (
    <Dialog labelledBy="child-title" onClose={() => setChild(false)}>
      <h2 id="child-title">Child modal</h2>
      <button onClick={() => setChild(false)}>Close child</button>
      <button onClick={onClose}>Close both</button>
    </Dialog>
  ) : null;
  return (
    <Dialog labelledBy="parent-title" onClose={onClose}>
      <h2 id="parent-title">Parent modal</h2>
      <button onClick={() => setChild(true)}>Open child</button>
      <button onClick={onClose}>Close parent</button>
      {portalled ? createPortal(nested, document.body) : nested}
    </Dialog>
  );
}
function RenderHarness() {
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState(0);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open parent</button>
      <button onClick={() => setActions((value) => value + 1)}>Background action {actions}</button>
      {open ? <RenderParent onClose={() => setOpen(false)} /> : null}
    </>
  );
}
const preserved = document.createElement("button");
preserved.textContent = "Preexisting inert control";
preserved.id = "preserved-inert";
preserved.inert = true;
document.body.append(preserved);
createRoot(document.getElementById("root")!).render(<RenderHarness />);
