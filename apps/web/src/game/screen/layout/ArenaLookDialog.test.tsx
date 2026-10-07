// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arePileCountsShown, setPileCountsShown } from "../../../design/pileCounts";
import { I18nProvider } from "../../../i18n";
import { ArenaCounters } from "../../ArenaCounters";
import { Side } from "../../side";
import { ArenaLookDialog } from "./ArenaLookDialog";

vi.mock("../../../design/sound", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../design/sound")>()),
  playSound: vi.fn<(kind: string) => void>(),
  unlockAudio: vi.fn<() => void>(),
}));

describe("match settings board section", () => {
  beforeEach(() => {
    localStorage.clear();
    setPileCountsShown(false);
  });
  afterEach(() => {
    cleanup();
    setPileCountsShown(false);
  });

  it("shows or hides the board counters behind the dialog as soon as the toggle flips", () => {
    render(
      <I18nProvider>
        <ArenaCounters side={Side.Viewer} eggs={3} hand={5} deck={16} trash={2} />
        <ArenaLookDialog deckColors={{}} onClose={() => undefined} />
      </I18nProvider>,
    );
    const board = screen.getByRole("region", { name: "Board" });
    const toggle = screen.getByRole("switch", { name: /Show pile counts/ });
    expect(board.contains(toggle)).toBe(true);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("group", { name: "You" })).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(arePileCountsShown()).toBe(true);
    expect(localStorage.getItem("aegis.pile-counts")).toBe("shown");
    expect(screen.getByRole("group", { name: "You" })).toBeTruthy();

    fireEvent.click(toggle);

    expect(screen.queryByRole("group", { name: "You" })).toBeNull();
  });
});
