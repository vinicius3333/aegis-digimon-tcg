import { cleanup, fireEvent, render } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { useModalFocus } from "@/design/useModalFocus";

function RenderChild() {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus({ surfaceRef: ref, focusFirst: true });
  return (
    <div ref={ref} tabIndex={-1}>
      <button>Child control</button>
    </div>
  );
}

function RenderParent() {
  const ref = useRef<HTMLDivElement>(null);
  const [child, setChild] = useState(false);
  useModalFocus({ surfaceRef: ref, focusFirst: true });
  return (
    <div ref={ref} tabIndex={-1}>
      <button onClick={() => setChild(true)}>Open child</button>
      {child ? <RenderChild /> : null}
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

test("restores background inert when parent and nested modal unmount together", () => {
  const background = document.createElement("button");
  background.inert = false;
  document.body.append(background);
  const view = render(<RenderParent />);
  fireEvent.click(view.getByText("Open child"));
  expect(background.inert).toBe(true);
  view.unmount();
  expect(background.inert).toBe(false);
});

for (const firstClosed of ["parent", "child"]) {
  for (const initiallyInert of [false, true]) {
    test(`restores original inert ${initiallyInert} when ${firstClosed} ownership closes first`, () => {
      const background = document.createElement("button");
      background.inert = initiallyInert;
      document.body.append(background);
      const parent = render(<RenderChild />);
      const child = render(<RenderChild />, { container: parent.container.firstElementChild as HTMLElement });
      expect(background.inert).toBe(true);
      const first = firstClosed === "parent" ? parent : child;
      const last = firstClosed === "parent" ? child : parent;
      first.unmount();
      expect(background.inert).toBe(true);
      last.unmount();
      expect(background.inert).toBe(initiallyInert);
      const reopened = render(<RenderChild />);
      expect(background.inert).toBe(true);
      reopened.unmount();
      expect(background.inert).toBe(initiallyInert);
    });
  }
}

test("mutation callbacks do not depend on released HTMLElement globals", () => {
  let notify: MutationCallback | undefined;
  const OriginalObserver = window.MutationObserver;
  const observe = vi.fn<(callback: MutationCallback) => MutationObserver>(function (callback) {
    notify = callback;
    return new OriginalObserver(callback);
  });
  vi.spyOn(window, "MutationObserver").mockImplementation(observe);
  const view = render(<RenderChild />);
  const background = document.createElement("button");
  background.inert = false;
  document.body.append(background);
  const ElementConstructor = globalThis.HTMLElement;
  vi.stubGlobal("HTMLElement", undefined);
  try {
    expect(() => notify?.([], {} as MutationObserver)).not.toThrow();
    expect(background.inert).toBe(true);
  } finally {
    vi.stubGlobal("HTMLElement", ElementConstructor);
    view.unmount();
  }
  expect(background.inert).toBe(false);
  expect(() => notify?.([], {} as MutationObserver)).not.toThrow();
  expect(background.inert).toBe(false);
});
