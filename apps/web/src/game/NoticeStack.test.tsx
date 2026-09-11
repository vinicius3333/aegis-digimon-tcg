// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";
import { NoticeStack } from "./NoticeStack";
import { NOTICE_LIFETIME_MS, type MatchNotice } from "./notices";

afterEach(cleanup);

function notice(overrides: Partial<MatchNotice> = {}): MatchNotice {
  return {
    id: "n1",
    side: "you",
    fromSecurity: false,
    body: { variant: "effect", cardId: "BT1-010", timing: "OnPlay", description: "Draw 1 card." },
    createdAt: 0,
    ...overrides,
  };
}

function renderNotice(
  shown: MatchNotice = notice(),
  props: Partial<Parameters<typeof NoticeStack>[0]> = {},
  onDismiss: (id: string) => void = () => undefined,
) {
  return render(
    <I18nProvider>
      <NoticeStack notice={shown} remainingMs={NOTICE_LIFETIME_MS} onDismiss={onDismiss} {...props} />
    </I18nProvider>,
  );
}

describe("NoticeStack", () => {
  it("shows the resolving clause under its printed timing label", () => {
    renderNotice();
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("On Play");
    expect(shown.textContent).toContain("Draw 1 card.");
  });

  it("slices the attacking clause when the engine names the timing by its enum key", () => {
    // BT24-016 prints a [Hand] [Main] clause before its [When Digivolving] [When Attacking]
    // one; the engine announces the attack as "OnUseAttack" with an internal description.
    renderNotice(
      notice({
        body: {
          variant: "effect",
          cardId: "BT24-016",
          timing: "OnUseAttack",
          description: "[WhenAttacking] Security manipulation, Security manipulation",
        },
      }),
    );
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("When Attacking");
    expect(shown.textContent).toContain("Your opponent places 1 card from their hand as the bottom security card.");
    expect(shown.textContent).not.toContain("[Hand]");
  });

  it("marks whose moment it is, so the slot it sits in can be read at a glance", () => {
    renderNotice(notice({ side: "opp" }));
    expect(screen.getByTestId("match-notice").getAttribute("data-side")).toBe("opp");
  });

  it("erodes its border over exactly the time the queue is holding it for", () => {
    const { container } = renderNotice(notice(), { remainingMs: 1234 });
    expect((container.querySelector(".match-notice__erode") as HTMLElement).style.animationDuration).toBe("1234ms");
  });

  it("pauses the eroding border while a decision holds the clock", () => {
    renderNotice(notice(), { held: true });
    expect(screen.getByTestId("match-notice-stack").getAttribute("data-held")).toBe("true");
  });

  it("always prints the clause, on every layout", () => {
    // It is the one thing on the notice the player cannot read off the board, and the
    // phone's slot now shows one moment at a time, so there is room for it.
    renderNotice();
    expect(screen.getByTestId("match-notice").textContent).toContain("Draw 1 card.");
    expect(screen.queryByRole("button", { name: /effect text$/ })).toBeNull();
  });

  it("names a recovery without exposing the card behind it", () => {
    renderNotice(notice({ body: { variant: "recovery", amount: 2 } }));
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("Recovery +2");
    expect(shown.querySelector("img")).toBeNull();
  });

  it("marks a refused action apart from the rest", () => {
    renderNotice(notice({ body: { variant: "rejection", reason: "Not enough memory." } }));
    const shown = screen.getByTestId("match-notice");
    expect(shown.getAttribute("data-variant")).toBe("rejection");
    expect(shown.textContent).toContain("Not enough memory.");
  });

  it("names the card behind an effect and opens it", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
          <NoticeStack notice={notice()} remainingMs={NOTICE_LIFETIME_MS} onDismiss={() => undefined} />
        </CardOpenerProvider>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Agumon" }));
    expect(opened).toEqual(["BT1-010"]);
  });

  it("keeps the name plain when there is nowhere to open a card", () => {
    renderNotice();
    expect(screen.getByTestId("match-notice").textContent).toContain("Agumon");
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });

  it("names a card the definitions do not know without showing its id", () => {
    renderNotice(notice({ body: { variant: "keyword", keyword: "digiXros", cardId: "ZZ9-999" } }));
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("Card");
    expect(shown.textContent).not.toContain("ZZ9-999");
  });

  it("advances to the next moment through its close button", () => {
    const onDismiss = vi.fn<(id: string) => void>();
    renderNotice(notice(), {}, onDismiss);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismiss).toHaveBeenCalledWith("n1");
  });
});
