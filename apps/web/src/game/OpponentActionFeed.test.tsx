// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { OpponentActionFeed, PlayLogSidebar } from "./OpponentActionFeedView";
import type { OpponentActionItem } from "./opponentActionFeed";
import { TIMINGS } from "./timings";

afterEach(cleanup);

function action(id: string, card: string): OpponentActionItem {
  return {
    id,
    kind: "attack",
    titleKey: "feed.attackedYourSecurity",
    titleParams: { card },
    durationMs: TIMINGS.feedAction,
  };
}

describe("OpponentActionFeed", () => {
  it("announces only the current action and opens history as one accessible button", () => {
    const onOpenHistory = vi.fn();
    render(
      <I18nProvider>
        <OpponentActionFeed
          current={action("current", "Greymon")}
          trail={[action("previous", "Agumon")]}
          pendingCount={3}
          onOpenHistory={onOpenHistory}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Greymon");
    expect(screen.getByText("Agumon attacked your security")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open match history" }));
    expect(onOpenHistory).toHaveBeenCalledOnce();
  });
});

describe("PlayLogSidebar", () => {
  it("renders the same semantic log lines in a closable drawer", () => {
    render(
      <I18nProvider>
        <PlayLogSidebar
          log={[
            { kind: "opp", text: "Opponent played Agumon" },
            { kind: "sys", text: "Combat resolved" },
          ]}
          onClose={() => undefined}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Play log" })).toBeTruthy();
    expect(screen.getByText("Opponent played Agumon")).toBeTruthy();
    expect(screen.getByText("Combat resolved")).toBeTruthy();
  });

  it("turns a named card into a link that opens it", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <PlayLogSidebar
          log={[{ kind: "opp", text: "Opponent played Agumon.", cardIds: ["BT1-010"] }]}
          onClose={() => undefined}
          onOpenCard={(cardId) => opened.push(cardId)}
        />
      </I18nProvider>,
    );

    const link = screen.getByRole("button", { name: "Open Agumon" });
    fireEvent.click(link);
    expect(opened).toEqual(["BT1-010"]);
  });

  it("leaves a line with no named card unlinked", () => {
    render(
      <I18nProvider>
        <PlayLogSidebar
          log={[{ kind: "sys", text: "Combat resolved" }]}
          onClose={() => undefined}
          onOpenCard={() => undefined}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });
});

describe("OpponentActionFeed card links", () => {
  function revealAction(): OpponentActionItem {
    return {
      id: "reveal",
      kind: "revealed",
      cardId: "ST1-03",
      titleKey: "feed.cardRevealedBy",
      titleParams: { card: "Agumon", source: "Tsukaimon" },
      titleCardIds: ["BT1-045", "ST1-03"],
      durationMs: TIMINGS.feedAction,
    };
  }

  it("opens the card a trail line names, by pointer and by keyboard alike", () => {
    const opened: string[] = [];
    render(
      <I18nProvider>
        <OpponentActionFeed
          current={action("current", "Greymon")}
          trail={[revealAction()]}
          pendingCount={0}
          onOpenHistory={() => undefined}
          onOpenCard={(cardId) => opened.push(cardId)}
        />
      </I18nProvider>,
    );

    const link = screen.getByRole("button", { name: "Open Agumon" });
    expect(link.tabIndex).toBe(0);
    fireEvent.click(link);
    expect(opened).toEqual(["ST1-03"]);
  });

  it("links the newest line even while the history button sits beside it", () => {
    // The history used to wrap the whole line, and a button inside a button is
    // invalid markup and unreachable by keyboard. It is its own button now.
    const opened: string[] = [];
    render(
      <I18nProvider>
        <OpponentActionFeed
          current={revealAction()}
          trail={[]}
          pendingCount={0}
          onOpenHistory={() => undefined}
          onOpenCard={(cardId) => opened.push(cardId)}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Tsukaimon" }));
    expect(opened).toEqual(["BT1-045"]);
    expect(screen.getByRole("button", { name: "Open match history" })).toBeTruthy();
  });
});
