import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-008.js";
import "../index.js";

describe("BT16-008", () => {
  it("has Jamming and deletes a 3000 DP or lower opposing Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });
  it("once per turn suspends an opposing Digimon when attacking", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    }));

  it("plays and deletes exactly one opposing Digimon at the 3000 DP boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-008", as: "aquilamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 3000 },
            { card: "BT1-009", as: "aboveLimit", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    // Capture both ids first: the deleted permanent is off the board afterwards, so
    // `perm("atLimit")` can no longer resolve it.
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    const atLimitInstanceId = s.perm("atLimit").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === atLimitInstanceId)).toBe(true);
  });

  it("digivolves from Hawkmon for 2 and deletes an opposing Digimon at the 3000 DP boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-007", as: "hawkmon" }],
          hand: [{ card: "BT16-008", as: "aquilamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 3000 },
            { card: "BT1-009", as: "aboveLimit", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const atLimitInstanceId = s.perm("atLimit").topCard.instanceId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("aquilamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard?.cardId === "BT16-008");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === atLimitInstanceId)).toBe(true);
  });

  it("suspends an opposing Digimon from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-009", as: "host", under: ["BT16-008"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
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
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("survives a security Digimon battle because Aquilamon has Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-008", as: "aquilamon", dp: 1000 }], security: [] },
      1: { security: ["BT1-010"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aquilamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("aquilamon").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
