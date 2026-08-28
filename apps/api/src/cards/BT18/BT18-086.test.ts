import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-086.js";

describe("BT18-086 Lucemon: Larva", () => {
  it("covers security play, breeding replacement, and 0 DP protection", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isBreeding: true,
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{
        kind: "Aura",
        target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "eq", value: 0 } }, count: "all" },
        effect: { kind: "restriction", restriction: "beDeleted" },
      }],
    });
  });

  it("naturally plays a Lucemon from trash when revealed from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT18-086", as: "larva", faceUp: true }],
          trash: [{ card: "BT18-034", as: "lucemon" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId));

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    ).toBe(true);
  });

  it("naturally protects only 0 DP Digimon while a non-white Lucemon is present", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-086", as: "larva" },
            { card: "BT1-009", as: "normal" },
            { card: "BT18-034", as: "lucemon" },
          ],
        },
        1: { hand: [{ card: "BT18-019", as: "millenniummon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const normalId = s.perm("normal").permanentId;
    preferInstanceIds.push(normalId);
    s.state.turnSeat = 1;
    s.state.memory = 14;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("millenniummon").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === normalId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("larva").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId)).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("larva"), "beDeleted", "Digimon")).toBe(true);
  });

  it("naturally moves Larva from breeding when Satan Mode would leave play", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "BT18-086", as: "larva" }, battleArea: [{ card: "BT18-101", as: "satan" }] },
        1: { hand: [{ card: "BT18-019", as: "millenniummon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 14;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("millenniummon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("larva").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("satan").instanceId)).toBe(true);
  });
});
