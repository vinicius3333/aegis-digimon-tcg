import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-008.js";
import "../index.js";

describe("EX4-008 BlackGrowlmon", () => {
  it("trashes the top two cards of both decks before an optional trash-to-hand return", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 2 });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: {
        filter: {
          zone: "trash",
          controller: "mine",
          nameOrTrait: [
            { match: "name", tokens: ["Guilmon"] },
            { match: "name", tokens: ["Growlmon", "Gallantmon"] },
          ],
        },
        count: 1,
      },
    });
  });
  it("inherits the same optional return after deletion", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
    });
  });

  it("trashes two cards from both decks and may return a matching card", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011"],
          trash: ["BT12-007"],
          battleArea: [{ card: "EX4-008", as: "blackGrowlmon" }],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackGrowlmon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-007")).toBe(false);
  });

  it("returns a matching trash card after the host is deleted", async () => {
    const s = setupEngine(
      {
        0: { trash: ["BT12-007"], battleArea: [{ card: "BT4-009", as: "host", under: ["EX4-008"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-007")).toBe(false);
  });
});
