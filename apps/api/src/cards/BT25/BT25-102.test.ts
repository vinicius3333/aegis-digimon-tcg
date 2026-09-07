import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import "../index.js";

describe("BT25-102 Factorial Area", () => {
  it("with zero security still places itself face up and continues to the reduced play (Q6482-Q6483)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-102", as: "area" },
            { card: "BT25-008", as: "coronamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const areaId = s.inst("area").instanceId;
    const coronamonId = s.inst("coronamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: areaId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coronamonId),
    );

    expect(s.state.players[0]!.security).toContainEqual(expect.objectContaining({ instanceId: areaId, faceUp: true }));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coronamonId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(7); // Option cost 3; Coronamon's cost 3 is reduced to 0.
  });

  it("does not play a blue TS or a red non-TS card from hand for the Main play branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-102", as: "area" },
            { card: "BT24-019", as: "wrongColor" },
            { card: "BT25-007", as: "wrongTrait" },
          ],
          battleArea: [{ card: "BT25-089", as: "appmon" }],
          security: [{ card: "BT1-001" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const areaId = s.inst("area").instanceId;
    const wrongColorId = s.inst("wrongColor").instanceId;
    const wrongTraitId = s.inst("wrongTrait").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: areaId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([wrongColorId, wrongTraitId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === wrongColorId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === wrongTraitId)).toBe(false);
  });

  it("face-up Security grants only black/red TS Digimon Blocker and conditional Link +1", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-102", faceUp: true }],
        battleArea: [
          { card: "BT25-008", as: "redTs" },
          { card: "BT25-007", as: "redNonTs" },
          { card: "BT25-075", as: "vulcanusmon", under: [{ card: "BT25-009" }] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("redTs"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("redTs"), "Link")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("redNonTs"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("redNonTs"), "Link")).toBe(false);
  });

  it("Security plays an eligible level 4 TS from trash but excludes a same-color non-TS card", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-102", faceUp: true, as: "area" }],
          trash: [
            { card: "BT25-011", as: "eligible" },
            { card: "BT25-007", as: "nonTs" },
            { card: "BT25-075", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const eligibleId = s.inst("eligible").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("area"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonTs").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tooHigh").instanceId);
  });

  it("does not play an ineligible card when Security has no level-4 black/red TS candidate", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-102", faceUp: true, as: "area" }],
          hand: [
            { card: "BT24-019", as: "wrongColor" },
            { card: "BT25-007", as: "wrongTrait" },
          ],
          trash: [{ card: "BT25-075", as: "tooHigh" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("area"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongColor").instanceId, s.inst("wrongTrait").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tooHigh").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("fires the Security play from a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-102", as: "area" }],
          trash: [{ card: "BT25-011", as: "eligible" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
      ),
    ).toBe(true);
  });

  it("Q6485-Q6486 checks a previously face-up copy revealed and activates its Security effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-102", as: "area" }],
          trash: [{ card: "BT25-011", as: "eligible" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("area").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("area").instanceId));
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("area").instanceId, faceUp: true });

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", revealedCardId: "BT25-102", hasSecurityEffect: true }),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eligible").instanceId,
      ),
    ).toBe(true);
  });

  it("places itself face up at the bottom of security after taking the top card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-102", as: "area" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottomSecurity" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const areaId = s.inst("area").instanceId;
    const bottomSecurityId = s.inst("bottomSecurity").instanceId;

    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: areaId,
        useAs: "option",
      } as PlayCardIntentWithUseAs),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === areaId)).toMatchObject({
      instanceId: areaId,
      faceUp: true,
    });
  });
});
