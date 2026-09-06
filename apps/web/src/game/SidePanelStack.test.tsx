// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";
import { AttackAnnouncementBanner, SidePanelStack } from "./SidePanelStack";
import { SIDE_PANEL_LIFETIME_MS, type SidePanel } from "./sidePanels";

afterEach(cleanup);

function panel(overrides: Partial<SidePanel> = {}): SidePanel {
  return {
    id: "p1",
    titleKey: "panel.discardedCards",
    side: "you",
    cards: [
      { cardId: "BT1-001", badge: 1 },
      { cardId: "BT1-002", badge: 2 },
    ],
    ordered: false,
    createdAt: 0,
    ...overrides,
  };
}

function renderStack(panels: SidePanel[], onDismiss: (id: string) => void = () => undefined) {
  return render(
    <I18nProvider>
      <SidePanelStack panels={panels} nowMs={0} onDismiss={onDismiss} />
    </I18nProvider>,
  );
}

describe("SidePanelStack", () => {
  it("renders nothing when the stack is empty", () => {
    const { container } = renderStack([]);
    expect(container.querySelector(".side-panel-stack")).toBeNull();
  });

  it("titles each panel and numbers its cards", () => {
    renderStack([panel()]);
    expect(screen.getByText("Discarded cards")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("numbers a single card when the event carried an order", () => {
    renderStack([panel({ titleKey: "panel.revealedCards", ordered: true, cards: [{ cardId: "BT1-001", badge: 1 }] })]);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("leaves a lone unordered card unnumbered", () => {
    renderStack([panel({ titleKey: "panel.playedCard", cards: [{ cardId: "BT1-001", badge: 1 }] })]);
    expect(screen.queryByText("1")).toBeNull();
  });

  it("carries the opponent column's tail under its panels, and alone when it has none", () => {
    const { rerender } = render(
      <I18nProvider>
        <SidePanelStack panels={[]} nowMs={0} onDismiss={() => undefined} oppColumnTail={<i data-testid="tail" />} />
      </I18nProvider>,
    );
    const lone = screen.getByTestId("side-panel-stack");
    expect(lone.getAttribute("data-side")).toBe("opp");
    expect(lone.lastElementChild).toBe(screen.getByTestId("tail"));
    rerender(
      <I18nProvider>
        <SidePanelStack
          panels={[panel({ side: "opp" })]}
          nowMs={0}
          onDismiss={() => undefined}
          oppColumnTail={<i data-testid="tail" />}
        />
      </I18nProvider>,
    );
    const column = screen.getByTestId("side-panel-stack");
    expect(column.firstElementChild).toBe(screen.getByTestId("side-panel"));
    expect(column.lastElementChild).toBe(screen.getByTestId("tail"));
  });

  it("gives each origin its own column", () => {
    renderStack([panel({ id: "mine", side: "you" }), panel({ id: "theirs", side: "opp", createdAt: 1 })]);
    const columns = screen.getAllByTestId("side-panel-stack").map((node) => node.getAttribute("data-side"));
    expect(columns).toEqual(["opp", "you"]);
  });

  it("keeps a panel's eroding border on its own clock when another joins the column", () => {
    const { rerender } = renderStack([panel({ id: "a" })]);
    const durationOf = () =>
      (screen.getAllByTestId("side-panel")[0]!.querySelector(".side-panel__erode") as HTMLElement).style
        .animationDuration;
    expect(durationOf()).toBe(`${SIDE_PANEL_LIFETIME_MS}ms`);
    rerender(
      <I18nProvider>
        <SidePanelStack
          panels={[panel({ id: "a" }), panel({ id: "b", titleKey: "panel.deletedCards" })]}
          nowMs={0}
          onDismiss={() => undefined}
        />
      </I18nProvider>,
    );
    expect(durationOf()).toBe(`${SIDE_PANEL_LIFETIME_MS}ms`);
  });

  it("dismisses a panel through its close button", () => {
    const onDismiss = vi.fn<(id: string) => void>();
    renderStack([panel()], onDismiss);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Discarded cards" }));
    expect(onDismiss).toHaveBeenCalledWith("p1");
  });
});

describe("side panel card links", () => {
  function renderWithOpener(panels: SidePanel[], onOpenCard: (cardId: string) => void) {
    return render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={onOpenCard}>
          <SidePanelStack panels={panels} nowMs={0} onDismiss={() => undefined} />
        </CardOpenerProvider>
      </I18nProvider>,
    );
  }

  it("names every card the panel lists, so a deleted card can be read", () => {
    renderStack([panel({ titleKey: "panel.deletedCards" })]);
    const shown = screen.getByTestId("side-panel");
    expect(shown.textContent).toContain("Yokomon");
    expect(shown.textContent).toContain("Bebydomon");
  });

  it("opens a listed card from its name", () => {
    const opened: string[] = [];
    renderWithOpener([panel({ titleKey: "panel.deletedCards" })], (cardId) => opened.push(cardId));
    fireEvent.click(screen.getByRole("button", { name: "Open Bebydomon" }));
    expect(opened).toEqual(["BT1-002"]);
  });

  it("leaves the names as plain text when there is nowhere to open a card", () => {
    renderStack([panel()]);
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
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

  it("opens the attacker from the banner", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
          <AttackAnnouncementBanner announcement={{ id: "a", cardId: "BT1-001", side: "opp", createdAt: 0 }} />
        </CardOpenerProvider>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Yokomon" }));
    expect(opened).toEqual(["BT1-001"]);
  });
});
