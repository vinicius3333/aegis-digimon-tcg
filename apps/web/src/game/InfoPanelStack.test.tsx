// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { AttackAnnouncementBanner, InfoPanelStack } from "./InfoPanelStack";
import type { InfoPanel } from "./infoPanels";

afterEach(cleanup);

function panel(overrides: Partial<InfoPanel> = {}): InfoPanel {
  return {
    id: "p1",
    titleKey: "panel.discardedCards",
    side: "you",
    cards: [
      { cardId: "BT1-001", badge: 1 },
      { cardId: "BT1-002", badge: 2 },
    ],
    createdAt: 0,
    ...overrides,
  };
}

describe("InfoPanelStack", () => {
  it("renders nothing when the stack is empty", () => {
    const { container } = render(
      <I18nProvider>
        <InfoPanelStack panels={[]} onDismiss={() => undefined} />
      </I18nProvider>,
    );
    expect(container.querySelector(".info-panel-stack")).toBeNull();
  });

  it("titles each panel and numbers its cards", () => {
    render(
      <I18nProvider>
        <InfoPanelStack panels={[panel()]} onDismiss={() => undefined} />
      </I18nProvider>,
    );
    expect(screen.getByText("Discarded cards")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("stacks the opponent's panel above the viewer's", () => {
    render(
      <I18nProvider>
        <InfoPanelStack
          panels={[panel({ id: "mine", side: "you" }), panel({ id: "theirs", side: "opp", createdAt: 1 })]}
          onDismiss={() => undefined}
        />
      </I18nProvider>,
    );
    const sides = screen.getAllByTestId("info-panel").map((node) => node.getAttribute("data-side"));
    expect(sides).toEqual(["opp", "you"]);
  });

  it("dismisses a panel through its close button", () => {
    const onDismiss = vi.fn<(id: string) => void>();
    render(
      <I18nProvider>
        <InfoPanelStack panels={[panel()]} onDismiss={onDismiss} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Discarded cards" }));
    expect(onDismiss).toHaveBeenCalledWith("p1");
  });
});

describe("AttackAnnouncementBanner", () => {
  it("names the attacking card", () => {
    render(
      <I18nProvider>
        <AttackAnnouncementBanner announcement={{ id: "a", cardId: "BT1-001", side: "opp", createdAt: 0 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("attack-announcement").textContent).toContain("is attacking");
  });
});
