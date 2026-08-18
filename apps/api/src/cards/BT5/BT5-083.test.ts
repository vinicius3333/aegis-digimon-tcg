import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-083.js";

describe("BT5-083 Megidramon", () => {
  it("trashes up to five cards from both decks when digivolving", async () => {
    const cards = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-083", as: "megidramon" }], deck: cards },
      1: { deck: cards },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megidramon"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.trash).toHaveLength(5);
  });

  it("trashes all available cards when either deck has fewer than five", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-083", as: "megidramon" }], deck: ["BT1-010", "BT1-011"] },
      1: { deck: ["BT1-012"] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megidramon"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("may play a level 6 Gallantmon from trash on deletion when you have a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }, "BT1-087"],
          trash: [{ card: "BT5-081", as: "gallantmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gallantmon").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
  });

  it("does not offer the Gallantmon play without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }],
          trash: [{ card: "BT5-081", as: "gallantmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
