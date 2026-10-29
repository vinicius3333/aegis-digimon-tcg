// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityHubNav } from "@/community/CommunityHubNav";
import { CommunityHubSection } from "@/community/CommunityHubSection";
import { I18nProvider } from "@/i18n/I18nProvider";

describe("CommunityHubNav", () => {
  afterEach(() => cleanup());

  it("lists the tournaments tab after the roadmap tab and opens it", () => {
    const onTournaments = vi.fn<() => void>();
    render(
      <I18nProvider>
        <CommunityHubNav
          section={CommunityHubSection.DECKS.value}
          onDecks={vi.fn<() => void>()}
          onRoadmap={vi.fn<() => void>()}
          onTournaments={onTournaments}
        />
      </I18nProvider>,
    );

    const tabs = screen.getAllByRole("button").map((button) => button.textContent);
    expect(tabs).toEqual(["Decks", "Roadmap", "Tournaments"]);

    fireEvent.click(screen.getByRole("button", { name: "Tournaments" }));
    expect(onTournaments).toHaveBeenCalledOnce();
  });
});
