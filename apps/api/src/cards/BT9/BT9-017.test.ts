import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../EX2/EX2-011.js";
import "./BT9-017.js";

describe("BT9-017 Gallantmon (X Antibody)", () => {
  it("deletes one opposing Digimon with the lowest DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base", suspended: true }], hand: [{ card: "BT9-017", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-010", as: "lowest" }, { card: "BT2-047", as: "higher" }] } }, { autoSelectCards: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-017"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("unsuspends when its digivolution effect deletes nothing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base", suspended: true }], hand: [{ card: "BT9-017", as: "evolving" }] } });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("once per turn trashes opposing security when an opponent's Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-017", as: "gallant", under: ["BT2-020"] }] }, 1: { battleArea: [{ card: "BT1-028", as: "victim" }], security: ["BT1-001"] } });
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("deletes the lowest-DP Digimon and trashes security in the real Gallantmon X line", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-011", as: "gallantmon", suspended: true }],
        hand: [{ card: "BT9-017", as: "gallantmonX" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "lowest" },
          { card: "BT2-047", as: "higher" },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    }, {
      autoOrderTriggers: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.perm("lowest").permanentId);
    s.state.memory = 1;
    const lowestId = s.perm("lowest").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("gallantmon").permanentId,
      instanceId: s.inst("gallantmonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === lowestId) &&
      s.state.players[1]!.security.length === 1,
    );

    expect(s.perm("gallantmon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-047"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
