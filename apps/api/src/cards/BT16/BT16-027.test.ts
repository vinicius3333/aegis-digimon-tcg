import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-027.js";
import "../index.js";

describe("BT16-027", () => {
  it("bottom-decks an opposing Digimon with an equal-or-smaller stack", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: expect.objectContaining({ count: 1 }),
      });
    }
  });

  it("unsuspends once per turn and optionally bottom-decks a suspended opponent", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfAttack", frequency: "OncePerTurn" });
    expect(compiled.effects?.[3]?.actions?.[0]).toMatchObject({ kind: "Unsuspend" });
    expect(compiled.effects?.[3]?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });

  it("bottom-decks an opponent with no more sources than this Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-027", as: "source", under: ["BT1-009", "BT1-010"] }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "within", under: ["BT1-009", "BT1-010"] },
            { card: "BT1-010", as: "above", under: ["BT1-009", "BT1-011", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const withinId = s.perm("within").permanentId;
    const aboveId = s.perm("above").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });

  it("unsuspends and then bottom-decks a suspended opponent when Dragon Mode is stacked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-027", as: "source", suspended: true, under: ["BT16-028"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
