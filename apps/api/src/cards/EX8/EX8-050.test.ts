import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-050.js";

describe("EX8-050", () => {
  it("has Blocker and reveals 3 to play a Mineral or Rock Digimon costing 5 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "play", optional: true }],
      rest: "trash",
    });
  });
  it("reveals three cards on deletion, plays a matching Digimon, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-050", as: "source" }],
          deck: [
            { card: "EX8-049", as: "match" },
            { card: "EX8-048", as: "other" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const source = player.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-048")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
  });
});
