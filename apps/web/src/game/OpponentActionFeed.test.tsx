// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { MatchHistorySheet, OpponentActionFeed } from "./OpponentActionFeedView";
import type { OpponentActionItem } from "./opponentActionFeed";

afterEach(cleanup);

function action(id: string, card: string): OpponentActionItem {
  return {
    id,
    kind: "played",
    titleKey: "feed.opponentPlayed",
    titleParams: { card },
    durationMs: 2800,
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
    expect(screen.getByText("Opponent played Agumon")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open match history" }));
    expect(onOpenHistory).toHaveBeenCalledOnce();
  });
});

describe("MatchHistorySheet", () => {
  it("renders the same semantic log lines in a closable dialog", () => {
    render(
      <I18nProvider>
        <MatchHistorySheet
          log={[
            { kind: "opp", text: "Opponent played Agumon" },
            { kind: "sys", text: "Combat resolved" },
          ]}
          onClose={() => undefined}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Match history" })).toBeTruthy();
    expect(screen.getByText("Opponent played Agumon")).toBeTruthy();
    expect(screen.getByText("Combat resolved")).toBeTruthy();
  });
});
