import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-060.js";

describe("BT14-060", () => {
  it("is treated as Commandramon and reveals three to play a low-cost D-Brigade or DigiPolice Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Commandramon"] }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ to: "play", optional: true, filter: { playCostLte: 3 } }],
    });
  });
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "prevent",
        leaveCause: "otherThanYourEffect",
        cost: { kind: "deleteOwn" },
      }],
    }));

  it("naturally reveals and plays a traited Tamer at the printed play-cost boundary while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-060", as: "hiCommandramon", under: ["BT14-056"] }],
          deck: ["BT14-086", "AD1-001", "AD1-002"],
        },
        1: { battleArea: [{ card: "BT14-054", as: "target", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hiCommandramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-086"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-086")).toBe(true);
  });

  it("naturally prevents an opponent battle deletion through inherited leave-play replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-064", as: "host", dp: 2000, suspended: true, under: ["BT14-060"] },
            { card: "BT14-056", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
  });
});
