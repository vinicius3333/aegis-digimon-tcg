import "./BT13-060.js";
import "./BT13-097.js";
import "../EX3/EX3-029.js";
import "../P/P-078.js";
import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { compiled } from "./BT13-098.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = internalsOf(s.engine).cardSourceOf(s.perm("richard").topCard!);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT13-098/"))!
    .effectKey;
}

describe("BT13-098 Richard Sampson", () => {
  it("plays itself when an effect directly trashes it from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDiscardSecurity")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("uses the total security count for both memory and Main conditions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "totalSecurityCount",
        op: "lte",
        value: 6,
        raw: "there're 6 or fewer total cards in both players' security stacks",
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "nameExact", tokens: ["Kudamon"] }],
        },
        count: 1,
      },
      ignoreRequirements: true,
      from: ["hand"],
      payCost: true,
      into: { nameOrTrait: [{ match: "nameExact", tokens: ["Kentaurosmon"] }] },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("gains memory at the start of the main phase when total security is six or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-098", as: "richard" }] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("richard"));
    expect(s.state.memory).toBe(1);
  });

  it("gains memory on real entry to the main phase using both security stacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-098", as: "richard" }],
        hand: ["BT13-079"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from security when an effect directly trashes it", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT13-098", as: "richard", faceUp: true }],
          battleArea: [
            { card: "BT1-009", as: "target", suspended: true },
            { card: "BT13-097", as: "thomas", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT13-060", as: "roseBurst" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("roseBurst").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("richard").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("richard").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("richard").instanceId)).toBe(false);
  });

  it("digivolves an exact Kudamon into an exact Kentaurosmon from hand by suspending this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-098", as: "richard" },
            { card: "BT1-046", as: "kudamon" },
          ],
          hand: [{ card: "BT13-046", as: "kentaurosmon" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("richard").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kudamon").topCard.cardId === "BT13-046");
    expect(s.perm("richard").isSuspended).toBe(true);
    expect(s.perm("kudamon").topCard.cardId).toBe("BT13-046");
  });
});

describe("BT13-098 Richard Sampson — KB Q&A rulings", () => {
  function richardInPlay(s: ReturnType<typeof setupEngine>): boolean {
    return s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("richard").instanceId,
    );
  }

  it("does not play itself when revealed or searched from security, only when an effect trashes it (Q2345)", async () => {
    const revealed = setupEngine(
      {
        0: { security: [{ card: "BT13-098", as: "richard" }] },
        1: { hand: [{ card: "P-078", as: "espimon" }], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    revealed.state.turnSeat = 1;
    revealed.state.memory = 5;
    await revealed.ready();
    expect(
      revealed.engine.applyIntent(1, { type: "playCard", instanceId: revealed.inst("espimon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => revealed.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-078"));
    await drainMicrotasks();
    expect(revealed.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      revealed.inst("richard").instanceId,
    ]);
    expect(richardInPlay(revealed)).toBe(false);
    expect(
      revealed.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.from === "security" &&
          event.instanceIds.includes(revealed.inst("richard").instanceId),
      ),
    ).toBe(true);
    expect(revealed.decisions.filter(({ seat }) => seat === 0)).toEqual([]);

    const searched = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-029", as: "airdramon" }],
          security: [{ card: "BT13-098", as: "richard" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    searched.state.memory = 10;
    await searched.ready();
    expect(
      searched.engine.applyIntent(0, { type: "playCard", instanceId: searched.inst("airdramon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      searched.state.players[0]!.hand.some((card) => card.instanceId === searched.inst("richard").instanceId),
    );
    await drainMicrotasks();
    expect(searched.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      searched.inst("richard").instanceId,
    );
    expect(richardInPlay(searched)).toBe(false);
    expect(searched.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);

    const trashed = setupEngine(
      { 0: { security: [{ card: "BT13-098", as: "richard" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    trashed.state.turnSeat = 1;
    await trashed.ready();
    await advance(trashed.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => richardInPlay(trashed));
    expect(trashed.state.players[0]!.security).toHaveLength(0);
  });

  it("counts both players' security stacks together for the 6-or-fewer condition (Q2346)", async () => {
    async function memoryAfterStartOfMain(mySecurity: number, opponentSecurity: number): Promise<number> {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT13-098", as: "richard" }],
          hand: ["BT1-009"],
          security: mySecurity,
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: opponentSecurity },
      });
      s.state.memory = 3;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const memory = s.state.memory;
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return memory;
    }

    expect(await memoryAfterStartOfMain(3, 3)).toBe(4);
    expect(await memoryAfterStartOfMain(2, 4)).toBe(4);
    expect(await memoryAfterStartOfMain(0, 6)).toBe(4);
    expect(await memoryAfterStartOfMain(3, 4)).toBe(3);
    expect(await memoryAfterStartOfMain(7, 0)).toBe(3);
  });
});
