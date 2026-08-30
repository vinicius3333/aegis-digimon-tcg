import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-018.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT16-018", () => {
  it("prevents battle deletion on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }],
    });
  });
  it("gains +2000 DP as an inherited your-turn effect", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    }));

  it("prevents the chosen Digimon from being deleted in a natural battle after On Play (Q2617)", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-017", as: "ally" },
          ],
          hand: [{ card: "BT16-018", as: "source" }],
        },
        1: {
          // AD1-001 is a 5000-DP Security Digimon; the 2000-DP ally loses the battle unless
          // the production restriction is specifically applied to battle deletion.
          security: ["AD1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    const allyId = s.perm("ally").permanentId;
    preferredIds.push(allyId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("ally"), "beDeletedInBattle"));

    expect(observe(s.engine).isRestricted(s.perm("ally"), "beDeletedInBattle")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(true);
  });

  it("prevents battle deletion of the selected Digimon after a natural evolution", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-017", as: "base" },
            { card: "BT16-017", as: "ally" },
          ],
          hand: [{ card: "BT16-018", as: "source" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("ally").permanentId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-018");

    expect(observe(s.engine).isRestricted(s.perm("ally"), "beDeletedInBattle")).toBe(true);
  });

  it("applies the inherited +2000 DP your-turn bonus in the live engine", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-019", as: "host", dp: 6000, under: ["BT16-018"] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
  });
});
