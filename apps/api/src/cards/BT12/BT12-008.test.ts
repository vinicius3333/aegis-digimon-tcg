import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-008.js";
import "../ST7/ST7-06.js";
describe("BT12-008 Shoutmon", () => {
  it("carries and enforces its zero-cost Save-text alternate evolution", async () => {
    expect(digivolutionRequirementsFor("BT12-008")).toContainEqual(
      expect.objectContaining({ level: 2, texts: ["Save"], cost: 0, isAlternate: true }),
    );
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-005", as: "base" }], hand: [{ card: "BT12-008", as: "shoutmon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shoutmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-008");
    expect(s.state.memory).toBe(0);
  });

  it("rejects the alternate evolution from a level 2 card without Save text", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-002", as: "base" }], hand: [{ card: "BT12-008", as: "shoutmon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shoutmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may Save itself under one of its Tamers after deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "shoutmon" }, { card: "BT12-089", as: "tamer" }] },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
  });

  it("can decline Save and leave itself in trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "shoutmon" }, { card: "BT12-089", as: "tamer" }] },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("deletes only an eligible 4000 DP Digimon through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-008"] }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT12-021", as: "eligible", dp: 4000 },
            { card: "BT12-021", as: "tooLarge", dp: 5000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooLarge").permanentId);
  });

  it("requires Save text on the inherited host and resolves only once per turn", async () => {
    const noSave = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-008"] }] },
      1: { battleArea: [{ card: "BT12-021", as: "target", dp: 4000 }] },
    });
    await advance(noSave.engine).fire(EffectTiming.OnUseAttack, noSave.perm("host"));
    await settle(() => noSave.state.players[1]!.battleArea.length === 1);
    expect(noSave.state.players[1]!.battleArea).toHaveLength(1);

    const once = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-008"] }] },
        1: { battleArea: [{ card: "BT12-021", dp: 4000 }, { card: "BT12-021", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(once.engine).fire(EffectTiming.OnUseAttack, once.perm("host"));
    await settle(() => once.state.players[1]!.battleArea.length === 1);
    await advance(once.engine).fire(EffectTiming.OnUseAttack, once.perm("host"));
    await settle(() => once.state.players[1]!.battleArea.length === 1);
    expect(once.state.players[1]!.battleArea).toHaveLength(1);
  });
});
