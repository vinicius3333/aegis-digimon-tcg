// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { createBlankDeck } from "@/game/decks";
import { DeckEditor } from "@/screens/DeckEditor";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

const observers: Array<{ callback: ObserverCallback; targets: Element[]; disconnected: boolean }> = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private readonly record: (typeof observers)[number];
      constructor(callback: ObserverCallback) {
        this.record = { callback, targets: [], disconnected: false };
        observers.push(this.record);
      }
      observe(target: Element) {
        this.record.targets.push(target);
      }
      unobserve() {}
      disconnect() {
        this.record.disconnected = true;
      }
      takeRecords() {
        return [];
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function poolCardCount(container: HTMLElement) {
  return container.querySelector(".deck-card-grid")?.children.length ?? 0;
}

function revealMoreMarker() {
  const marker = screen.getByText(/Scroll for more/);
  const observer = observers.find((entry) => !entry.disconnected && entry.targets.includes(marker));
  expect(observer).toBeDefined();
  act(() => observer?.callback([{ isIntersecting: true, target: marker }]));
}

describe("deck editor card pool paging", () => {
  it("loads the next page when the scroll-for-more marker becomes visible in any scroll container", () => {
    const { container } = render(
      <I18nProvider>
        <DeckEditor
          deck={createBlankDeck([], "Red", "Paging deck")}
          onSave={() => undefined}
          onClose={() => undefined}
          onNav={() => undefined}
        />
      </I18nProvider>,
    );

    expect(poolCardCount(container)).toBe(60);

    revealMoreMarker();
    expect(poolCardCount(container)).toBe(120);

    revealMoreMarker();
    expect(poolCardCount(container)).toBe(180);
  });
});
