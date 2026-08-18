// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { CardActionMenu, TrashViewerOverlay } from "./overlays";

afterEach(() => cleanup());

const noop = () => {};

function renderSheet(props: Partial<React.ComponentProps<typeof CardActionMenu>> = {}) {
  return render(
    <I18nProvider>
      <CardActionMenu
        x={0}
        y={0}
        sheet
        cardId="BT1-009"
        canAttack={false}
        onViewStack={noop}
        onAttack={noop}
        onClose={noop}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("field card action sheet", () => {
  it("shows the DP bonus as a signed delta over the printed DP", () => {
    renderSheet({ dp: 5000, baseDP: 3000 });
    expect(screen.getByText(/5,000 DP|5\.000 DP/)).toBeTruthy();
    expect(screen.getByText(/^\+2[,.]000$/)).toBeTruthy();
  });

  it("marks a DP penalty as negative", () => {
    renderSheet({ dp: 2000, baseDP: 3000 });
    expect(screen.getByText(/^−1[,.]000$/)).toBeTruthy();
  });

  it("omits the delta when the permanent is at its printed DP", () => {
    const { container } = renderSheet({ dp: 3000, baseDP: 3000 });
    expect(container.querySelector(".card-action-sheet__stats em")).toBeNull();
  });

  it("spells synced keywords the way they are printed", () => {
    renderSheet({ keywords: ["SecurityAttack", "Blocker", "DeDigivolve"] });
    expect(screen.getByText("Security Attack")).toBeTruthy();
    expect(screen.getByText("Blocker")).toBeTruthy();
    expect(screen.getByText("De-Digivolve")).toBeTruthy();
  });

  it("lists the cards under the top card, grouped by role", () => {
    renderSheet({
      stackCards: [
        { cardId: "BT1-009", role: "top" },
        { cardId: "ST1-02", role: "stack" },
        { cardId: "ST1-03", role: "linked" },
      ],
    });
    expect(screen.getByText("Digivolution")).toBeTruthy();
    expect(screen.getByText("Linked")).toBeTruthy();
    // The active card is already the large preview; it is not repeated below.
    expect(screen.queryByText("Active")).toBeNull();
  });

  it("opens the dedicated stack viewer from the mobile action sheet", () => {
    const onViewStack = vi.fn<() => void>();
    renderSheet({ stackCards: [{ cardId: "ST1-02", role: "stack" }], onViewStack });
    fireEvent.click(screen.getByText("View stack"));
    expect(onViewStack).toHaveBeenCalledOnce();
  });

  it("enlarges the card in a modal when it is tapped", () => {
    const { container } = renderSheet();
    expect(container.querySelector(".card-zoom")).toBeNull();
    fireEvent.click(screen.getByLabelText("Enlarge card"));
    expect(document.querySelector(".card-zoom")).toBeTruthy();
  });

  it("enlarges a stack card when its thumbnail is tapped", () => {
    renderSheet({ stackCards: [{ cardId: "ST1-02", role: "stack" }] });
    const thumb = document.querySelector<HTMLButtonElement>(".card-action-sheet__stack button");
    expect(thumb).toBeTruthy();
    fireEvent.click(thumb!);
    expect(document.querySelector(".card-zoom")).toBeTruthy();
  });

  it("offers the breeding promote action only when one is supplied", () => {
    const onPromote = vi.fn();
    renderSheet({ promote: { label: "Move to battle", onPromote } });
    fireEvent.click(screen.getByText("Move to battle"));
    expect(onPromote).toHaveBeenCalledOnce();
    cleanup();
    renderSheet();
    expect(screen.queryByText("Move to battle")).toBeNull();
  });

  it("offers attack only when the permanent can attack", () => {
    const onAttack = vi.fn();
    renderSheet({ canAttack: true, onAttack });
    expect(screen.getByText("Attack")).toBeTruthy();
    cleanup();
    renderSheet({ canAttack: false });
    expect(screen.queryByText("Attack")).toBeNull();
  });
});

describe("desktop field card action menu", () => {
  it("focuses View stack and closes with Escape", () => {
    const onClose = vi.fn<() => void>();
    renderSheet({ sheet: false, onClose });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "View stack" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("trash bottom sheet", () => {
  function renderTrash(cardIds: string[]) {
    return render(
      <I18nProvider>
        <TrashViewerOverlay cardIds={cardIds} title="Your trash" sheet onClose={noop} />
      </I18nProvider>,
    );
  }

  it("queues every trashed card into one scrollable row, newest first", () => {
    renderTrash(["BT1-009", "ST1-02", "ST1-03"]);
    const captions = document.querySelectorAll(".trash-sheet__row figcaption");
    expect(captions).toHaveLength(3);
    expect(captions[0]!.textContent).toBe(getCardDefinition("ST1-03")?.nameEn ?? "ST1-03");
  });

  it("enlarges a trashed card when it is tapped", () => {
    renderTrash(["BT1-009"]);
    fireEvent.click(document.querySelector(".trash-sheet__row > button")!);
    expect(document.querySelector(".card-zoom")).toBeTruthy();
  });

  it("says so when the trash is empty", () => {
    renderTrash([]);
    expect(screen.getByText("trash is empty")).toBeTruthy();
  });
});
