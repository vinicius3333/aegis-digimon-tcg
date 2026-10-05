// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { installTranslationCompatibility } from "./translationCompatibility";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("updates live labels after translation and inserts before the replaced Text", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = installTranslationCompatibility(container);
  const root = createRoot(container);
  function View({ label, before }: { label: string; before?: boolean }) {
    return (
      <button>
        {before && <span>Before</span>}
        {label}
        <span>1</span>
      </button>
    );
  }
  try {
    await act(async () => root.render(<View label="Attack" />));
    const button = container.querySelector("button")!;
    const text = button.firstChild!;
    const translated = document.createElement("font");
    translated.style.verticalAlign = "inherit";
    translated.textContent = "Atacar";
    button.insertBefore(translated, text);
    button.removeChild(text);
    await act(async () => root.render(<View label="End turn" before />));
    expect(button.textContent).toBe("BeforeEnd turn1");
  } finally {
    await act(async () => root.unmount());
    dispose();
    container.remove();
  }
});

it("#4943 keeps React removals and insertions working after browser translation replaces text", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = installTranslationCompatibility(container);
  const root = createRoot(container);
  function View({ show }: { show: boolean }) {
    return (
      <button>
        {show && "Attack"}
        <span>1</span>
      </button>
    );
  }
  try {
    await act(async () => root.render(<View show />));
    const button = container.querySelector("button")!;
    const text = button.firstChild!;
    const translated = document.createElement("font");
    translated.style.verticalAlign = "inherit";
    translated.textContent = "Atacar";
    button.insertBefore(translated, text);
    button.removeChild(text);
    await Promise.resolve();
    await act(async () => root.render(<View show={false} />));
    expect(container.querySelector("button")!.textContent).toBe("1");
    await act(async () => root.render(<View show />));
    expect(container.querySelector("button")!.textContent).toBe("Attack1");
  } finally {
    await act(async () => root.unmount());
    dispose();
    container.remove();
  }
});

it("preserves errors for ordinary invalid DOM removals", () => {
  const container = document.createElement("div");
  const dispose = installTranslationCompatibility(container);
  try {
    expect(() => container.removeChild(document.createTextNode("missing"))).toThrow(/not a child/i);
  } finally {
    dispose();
  }
});

it("does not mistake an existing translated neighbor for a replaced Text", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const translated = document.createElement("font");
  translated.style.verticalAlign = "inherit";
  translated.textContent = "Keep";
  const ordinary = document.createTextNode("Remove");
  container.append(translated, ordinary);
  const dispose = installTranslationCompatibility(container);
  try {
    container.removeChild(ordinary);
    await Promise.resolve();
    expect(() => container.removeChild(ordinary)).toThrow(/not a child/i);
    expect(container.textContent).toBe("Keep");
  } finally {
    dispose();
    container.remove();
  }
});
