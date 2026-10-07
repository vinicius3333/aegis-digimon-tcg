// @vitest-environment jsdom
import { useRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DecisionResponse } from "@aegis/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";
import { useDraggableWindow } from "../../chat/useDraggableWindow";
import { setEffectPromptPosition } from "../../effectPromptPosition";
import { DecisionOverlay } from "./DecisionOverlay";

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
function viewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}
beforeEach(() => {
  viewport(1200, 900);
  localStorage.setItem("aegis.locale", "en");
  setEffectPromptPosition("left");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  viewport(originalWidth, originalHeight);
});

function pointer(element: Element, type: string, x: number, y: number, pointerType = "mouse") {
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        pointerType,
        clientX: x,
        clientY: y,
      }),
    );
  });
}

function mountPrompt() {
  const respond = vi.fn<(response: DecisionResponse) => void>();
  const view = (decisionId = "activation") => (
    <I18nProvider>
      <DecisionOverlay
        request={{ decisionId, seat: 0, kind: "optional", promptText: "Activate this effect?" }}
        candidates={[]}
        picks={[]}
        onTogglePick={() => undefined}
        onRespond={respond}
      />
    </I18nProvider>
  );
  const mounted = render(view());
  const panel = screen.getByRole("dialog");
  vi.spyOn(panel, "getBoundingClientRect").mockImplementation(() => {
    const left = Number.parseFloat(panel.style.getPropertyValue("--effect-prompt-drag-left")) || 100;
    const top = Number.parseFloat(panel.style.getPropertyValue("--effect-prompt-drag-top")) || 200;
    return { left, top, x: left, y: top, right: left + 320, bottom: top + 200, width: 320, height: 200, toJSON() {} };
  });
  return { ...mounted, panel, respond, view, handle: screen.getByRole("button", { name: "Move effect prompt" }) };
}

it.each(["mouse", "touch"])("moves an activation with %s without sending an answer", (pointerType) => {
  const { panel, handle, respond } = mountPrompt();
  expect(panel.dataset.promptSurface).toBe("left");
  pointer(handle, "pointerdown", 120, 220, pointerType);
  pointer(handle, "pointermove", 420, 520, pointerType);
  pointer(handle, "pointerup", 420, 520, pointerType);
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("400px");
  expect(panel.style.getPropertyValue("--effect-prompt-drag-top")).toBe("500px");
  expect(panel.dataset.promptDragged).toBe("true");
  expect(respond).not.toHaveBeenCalled();
  pointer(handle, "pointermove", 800, 800, pointerType);
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("400px");
});

it("keeps the whole panel inside the viewport when dragged or resized", () => {
  const { panel, handle } = mountPrompt();
  pointer(handle, "pointerdown", 120, 220);
  pointer(handle, "pointermove", -1000, -1000);
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("16px");
  expect(panel.style.getPropertyValue("--effect-prompt-drag-top")).toBe("16px");
  pointer(handle, "pointermove", 2000, 2000);
  pointer(handle, "pointerup", 2000, 2000);
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("864px");
  expect(panel.style.getPropertyValue("--effect-prompt-drag-top")).toBe("684px");
  viewport(400, 500);
  fireEvent(window, new Event("resize"));
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("64px");
  expect(panel.style.getPropertyValue("--effect-prompt-drag-top")).toBe("284px");
});

it("starts each new decision at its chosen position and ignores the previous drag", () => {
  const { panel, handle, rerender, view } = mountPrompt();
  pointer(handle, "pointerdown", 120, 220);
  pointer(handle, "pointermove", 420, 520);
  rerender(view("next-activation"));
  expect(panel.dataset.promptDragged).toBeUndefined();
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("");
  pointer(handle, "pointermove", 900, 800);
  expect(panel.dataset.promptDragged).toBeUndefined();
  pointer(handle, "pointerdown", 120, 220);
  pointer(handle, "pointermove", 420, 520);
  act(() => setEffectPromptPosition("center"));
  expect(panel.dataset.promptSurface).toBe("center");
  expect(panel.dataset.promptDragged).toBeUndefined();
  act(() => setEffectPromptPosition("left"));
  expect(panel.dataset.promptSurface).toBe("left");
  expect(panel.dataset.promptDragged).toBeUndefined();
});

it("cancels a touch drag and leaves the answer buttons functional", () => {
  const { panel, handle, respond } = mountPrompt();
  pointer(handle, "pointerdown", 120, 220, "touch");
  pointer(handle, "pointermove", 420, 520, "touch");
  pointer(handle, "pointercancel", 420, 520, "touch");
  pointer(handle, "pointermove", 900, 800, "touch");
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("400px");
  const use = screen.getByRole("button", { name: /yes, activate/i });
  pointer(use, "pointerdown", 120, 220);
  pointer(use, "pointermove", 400, 400);
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("400px");
  fireEvent.click(use);
  expect(respond).toHaveBeenCalledWith({ kind: "optional", accept: true });
});

it("moves with keyboard arrows, resets with Home, and keeps focus inside", () => {
  const { panel, handle } = mountPrompt();
  handle.focus();
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(panel.style.getPropertyValue("--effect-prompt-drag-left")).toBe("120px");
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(panel.style.getPropertyValue("--effect-prompt-drag-top")).toBe("180px");
  fireEvent.keyDown(handle, { key: "Home" });
  expect(panel.dataset.promptDragged).toBeUndefined();
  const lastButton = screen.getByRole("button", { name: /view board/i });
  lastButton.focus();
  fireEvent.keyDown(lastButton, { key: "Tab" });
  expect(document.activeElement).toBe(handle);
});

it("does not add dragging controls to field target or cost decisions", () => {
  const view = (cost: boolean) => (
    <I18nProvider>
      <DecisionOverlay
        request={
          cost
            ? {
                decisionId: "cost",
                seat: 0,
                kind: "chooseOption",
                promptText: "Choose a cost",
                options: { purpose: "cost", choices: ["Pay"] },
              }
            : {
                decisionId: "targets",
                seat: 0,
                kind: "chooseTargets",
                promptText: "Choose targets",
                options: { candidateInstanceIds: [] },
              }
        }
        candidates={[]}
        picks={[]}
        onTogglePick={() => undefined}
        onRespond={() => undefined}
      />
    </I18nProvider>
  );
  const mounted = render(view(false));
  expect(screen.queryByRole("button", { name: "Move effect prompt" })).toBeNull();
  mounted.rerender(view(true));
  expect(screen.queryByRole("button", { name: "Move effect prompt" })).toBeNull();
});

it("preserves chat's default gutter and does not drag when clicking a header control", () => {
  function ChatWindow() {
    const ref = useRef<HTMLDivElement>(null);
    const { position, handleProps } = useDraggableWindow(ref);
    return (
      <div ref={ref} data-testid="chat" data-left={position?.left} data-top={position?.top}>
        <header {...handleProps} data-testid="chat-header">
          <button type="button">Close chat</button>
        </header>
      </div>
    );
  }
  render(<ChatWindow />);
  const panel = screen.getByTestId("chat");
  vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 200,
    x: 100,
    y: 200,
    right: 420,
    bottom: 400,
    width: 320,
    height: 200,
    toJSON() {},
  });
  const close = screen.getByRole("button", { name: "Close chat" });
  pointer(close, "pointerdown", 120, 220);
  pointer(close, "pointermove", 500, 500);
  expect(panel.dataset.left).toBeUndefined();
  const header = screen.getByTestId("chat-header");
  pointer(header, "pointerdown", 120, 220);
  pointer(header, "pointermove", -1000, -1000);
  pointer(header, "pointerup", -1000, -1000);
  expect(panel.dataset.left).toBe("4");
  expect(panel.dataset.top).toBe("4");
});
