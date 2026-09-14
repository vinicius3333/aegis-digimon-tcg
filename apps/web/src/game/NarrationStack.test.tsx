// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { NarrationStack } from "./NarrationStack";
import type { NarrationItem } from "./narration";
import { TIMINGS } from "./timings";

afterEach(cleanup);

it("reserves space for the security dock and releases it when the dock closes", () => {
  const opponent = { ...item("security-reveal"), side: "opp" as const };
  const view = (active: boolean, compact: boolean) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map([[opponent.id, opponent]])}
        compact={compact}
        securityDockActive={active}
        rejection={null}
        nowMs={0}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view(true, false));
  expect(container.querySelector('[data-slot="narration-opp"][data-security-dock]')).toBeTruthy();
  rerender(view(false, false));
  expect(container.querySelector("[data-security-dock]")).toBeNull();
  rerender(view(true, true));
  expect(container.querySelector('[data-slot="narration"][data-security-dock]')).toBeTruthy();
});

function item(id: string): NarrationItem {
  return {
    id,
    side: "you",
    batchId: "batch",
    createdAt: 0,
    notice: { id, side: "you", fromSecurity: false, createdAt: 0, body: { variant: "recovery", amount: 1 } },
  };
}

it("keeps two records in the portrait column and dismisses only the selected ID", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([item("one"), item("two")].map((entry) => [entry.id, entry]))}
        compact
        nowMs={0}
        rejection={null}
        onAdvance={onAdvance}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('[data-slot="narration"] .narration-item')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Dismiss notice" })[1]!);
  expect(onAdvance).toHaveBeenCalledExactlyOnceWith("two");
});

it("does not accelerate an existing countdown when another record arrives", () => {
  const first = item("one");
  const view = (items: NarrationItem[], nowMs: number) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map(items.map((entry) => [entry.id, entry]))}
        nowMs={nowMs}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view([first], 0));
  const ring = container.querySelector(".match-notice__erode") as HTMLElement;
  expect(ring.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
  rerender(view([first, { ...item("two"), createdAt: 2000 }], 2000));
  expect(container.querySelector(".match-notice__erode")).toBe(ring);
  expect(ring.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
});
