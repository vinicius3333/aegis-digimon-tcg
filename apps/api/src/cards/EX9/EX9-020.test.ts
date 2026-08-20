import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-020.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-020", () => {
  it("has Blast Digivolve, Alliance, and Blocker and bottom-decks an opposing level 5 or lower Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }]));
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: { filter: { levelComparison: { op: "lte", value: 5 } } } });
  });
  it("DNA digivolves into Omnimon Alter-S when it would leave play and prevents attack target changes", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "DnaDigivolve", optional: true }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" });
  });

  it("bottom-decks an opposing level 5 or lower Digimon on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-020", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-001"] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    const targetId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetId)).toBe(true);
  });
});
