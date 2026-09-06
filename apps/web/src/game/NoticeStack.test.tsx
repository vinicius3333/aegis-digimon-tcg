// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";
import { NoticeStack } from "./NoticeStack";
import { NOTICE_CROWDED_LIFETIME_MS, NOTICE_LIFETIME_MS, type MatchNotice } from "./notices";

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

function renderStack(notices: MatchNotice[], onDismiss: (id: string) => void = () => undefined) {
  return render(
    <I18nProvider>
      <NoticeStack notices={notices} nowMs={0} onDismiss={onDismiss} />
    </I18nProvider>,
  );
}

describe("NoticeStack", () => {
  it("renders nothing when there is nothing to say", () => {
    const { container } = renderStack([]);
    expect(container.querySelector(".match-notice-stack")).toBeNull();
  });

  it("shows the resolving clause under its printed timing label", () => {
    renderStack([notice()]);
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("On Play");
    expect(shown.textContent).toContain("Draw 1 card.");
  });

  it("slices the attacking clause when the engine names the timing by its enum key", () => {
    // BT24-016 prints a [Hand] [Main] clause before its [When Digivolving] [When Attacking]
    // one; the engine announces the attack as "OnUseAttack" with an internal description.
    renderStack([
      notice({
        body: {
          variant: "effect",
          cardId: "BT24-016",
          timing: "OnUseAttack",
          description: "[WhenAttacking] Security manipulation, Security manipulation",
        },
      }),
    ]);
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("When Attacking");
    expect(shown.textContent).toContain("Your opponent places 1 card from their hand as the bottom security card.");
    expect(shown.textContent).not.toContain("[Hand]");
  });

  it("anchors the viewer's effects bottom-left and the opponent's top-right", () => {
    renderStack([notice({ id: "mine", side: "you" }), notice({ id: "theirs", side: "opp" })]);
    const anchors = screen.getAllByTestId("match-notice-stack").map((node) => node.getAttribute("data-anchor"));
    expect(anchors).toEqual(["bottom-left", "top-right"]);
  });

  it("mirrors a security effect to the middle of the opposite half", () => {
    renderStack([notice({ fromSecurity: true })]);
    expect(screen.getByTestId("match-notice-stack").getAttribute("data-anchor")).toBe("middle-left");
  });

  it("draws one family at a time while keeping the whole set's clock", () => {
    const crowd = [
      notice({ id: "s", fromSecurity: true }),
      notice({ id: "a" }),
      notice({ id: "b" }),
      notice({ id: "c" }),
    ];
    const { container, rerender } = render(
      <I18nProvider>
        <NoticeStack notices={crowd} family="security" nowMs={0} onDismiss={() => undefined} />
      </I18nProvider>,
    );
    expect(screen.getAllByTestId("match-notice")).toHaveLength(1);
    expect(screen.getByTestId("match-notice-stack").getAttribute("data-anchor")).toBe("middle-left");
    // Four notices share the screen, so even the lone security one is on the crowded clock.
    expect((container.querySelector(".match-notice__erode") as HTMLElement).style.animationDuration).toBe(
      `${NOTICE_CROWDED_LIFETIME_MS}ms`,
    );
    rerender(
      <I18nProvider>
        <NoticeStack notices={crowd} family="corners" nowMs={0} onDismiss={() => undefined} />
      </I18nProvider>,
    );
    expect(screen.getAllByTestId("match-notice")).toHaveLength(3);
    expect(screen.getByTestId("match-notice-stack").getAttribute("data-anchor")).toBe("bottom-left");
  });

  it("names a recovery without exposing the card behind it", () => {
    renderStack([notice({ body: { variant: "recovery", amount: 2 } })]);
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("Recovery +2");
    expect(shown.querySelector("img")).toBeNull();
  });

  it("marks a refused action apart from the rest", () => {
    renderStack([notice({ body: { variant: "rejection", reason: "Not enough memory." } })]);
    const shown = screen.getByTestId("match-notice");
    expect(shown.getAttribute("data-variant")).toBe("rejection");
    expect(shown.textContent).toContain("Not enough memory.");
  });

  it("disperses the stack faster once a third notice arrives", () => {
    const durationOf = () =>
      (screen.getAllByTestId("match-notice")[0]!.querySelector(".match-notice__erode") as HTMLElement).style
        .animationDuration;
    const { rerender } = renderStack([notice({ id: "a" }), notice({ id: "b" })]);
    expect(durationOf()).toBe(`${NOTICE_LIFETIME_MS}ms`);
    rerender(
      <I18nProvider>
        <NoticeStack
          notices={[notice({ id: "a" }), notice({ id: "b" }), notice({ id: "c" })]}
          nowMs={0}
          onDismiss={() => undefined}
        />
      </I18nProvider>,
    );
    expect(durationOf()).toBe(`${NOTICE_CROWDED_LIFETIME_MS}ms`);
  });

  it("names the card behind an effect and opens it", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
          <NoticeStack notices={[notice()]} nowMs={0} onDismiss={() => undefined} />
        </CardOpenerProvider>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Agumon" }));
    expect(opened).toEqual(["BT1-010"]);
  });

  it("keeps the name plain when there is nowhere to open a card", () => {
    renderStack([notice()]);
    expect(screen.getByTestId("match-notice").textContent).toContain("Agumon");
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });

  it("names a card the definitions do not know without showing its id", () => {
    renderStack([notice({ body: { variant: "keyword", keyword: "digiXros", cardId: "ZZ9-999" } })]);
    const shown = screen.getByTestId("match-notice");
    expect(shown.textContent).toContain("Card");
    expect(shown.textContent).not.toContain("ZZ9-999");
  });

  it("dismisses a notice through its close button", () => {
    const onDismiss = vi.fn<(id: string) => void>();
    renderStack([notice()], onDismiss);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismiss).toHaveBeenCalledWith("n1");
  });
});
