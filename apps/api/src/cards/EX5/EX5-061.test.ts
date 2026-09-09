import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-039.js";
import "../BT10/BT10-011.js";
import "../P/P-065.js";
import "../index.js";
import { compiled } from "./EX5-061.js";

describe("EX5-061 Cerberusmon (X Antibody)", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-061")).toMatchObject({
      cardId: "EX5-061",
      nameEn: "Cerberusmon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Dark Animal", "X Antibody"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      effectText:
        "[On Play] You may play 1 purple level 3 Digimon card from your trash without paying the cost.[When Digivolving] ＜Draw 1＞ (Draw 1 card from your deck). Then, trash 1 card in your hand. If a Digimon card with [Cerberusmon]\u00a0in its name or [X Antibody] is in this Digimon's digivolution cards, activate this Digimon's [On Play] effects.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] By deleting 1 of your other Digimon, unsuspend this Digimon.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Cerberusmon"] },
              { match: "nameExact", tokens: ["X Antibody"] },
            ],
          },
        },
      },
      {
        kind: "ActivateForeignEffect",
        zone: "digivolutionCards",
        fromTriggers: ["OnPlay"],
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Gammamon"], match: "nameExact" }],
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: { kind: "deleteOwn", target: { count: 1, filter: { controller: "mine", excludeSelf: true } } },
        },
      ],
    });
  });

  it("plays a purple level 3 Digimon from trash without cost on play", async () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] } },
    });
  });
  it("draws, trashes, and reactivates On Play when Cerberusmon or X Antibody is in the stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Cerberusmon"] },
              { match: "nameExact", tokens: ["X Antibody"] },
            ],
          },
        },
      },
      {
        kind: "ActivateForeignEffect",
        zone: "digivolutionCards",
        fromTriggers: ["OnPlay"],
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Gammamon"], match: "nameExact" }],
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: {
            kind: "deleteOwn",
            target: { count: 1, filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] } },
          },
        },
      ],
    });
  });

  it("plays a purple level 3 from trash through the public On Play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-061", as: "source" }], trash: [{ card: "BT14-069", as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT14-069"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT14-069")).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT14-069")).toBe(false);
  });

  it("may decline the On Play revival when no effect is chosen", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-061", as: "source" }], trash: [{ card: "BT14-069", as: "candidate" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT14-069")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT14-069")).toBe(false);
  });

  it("reactivates On Play only for an exact X Antibody stack card", async () => {
    const resolve = async (stackCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-072", as: "base", under: [stackCard] }],
            hand: [
              { card: "EX5-061", as: "evolving" },
              { card: "BT1-010", as: "discard" },
            ],
            trash: [{ card: "BT14-069", as: "candidate" }],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      return s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT14-069");
    };

    expect(await resolve("BT9-109")).toBe(true);
    expect(await resolve("BT13-063")).toBe(false);
  });

  it("answers Q3660 by reactivating this On Play and the stacked Gammamon effect", async () => {
    expect(getCardDefinition("P-065")).toMatchObject({ cardId: "P-065", level: 3, dp: 2000 });
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-072", as: "base", under: ["BT1-039", "BT10-011", "P-065"] }],
          hand: [
            { card: "EX5-061", as: "evolving" },
            { card: "BT1-010", as: "discard" },
          ],
          trash: [{ card: "BT14-069", as: "revival" }],
          deck: ["BT1-012"],
        },
        1: { battleArea: [{ card: "P-065", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const victimId = s.perm("victim").permanentId;
    preferred.push(s.inst("revival").instanceId, victimId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069") &&
        s.state.pendingDecision === undefined,
    );
    // ActivateForeignEffect resolves the lender's On Play body inline under EX5-061;
    // it does not emit a separate top-level effectTriggered event for P-065. The
    // printed P-065 source card and its public deletion endpoint are the provenance
    // proof here, while EX5-061's own revival is asserted independently below.
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === victimId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-012"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("unsuspends once per turn after deleting another Digimon through public attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-072", as: "attacker", under: ["EX5-061"] },
            { card: "BT1-009", as: "sacrificeOne" },
            { card: "BT1-010", as: "sacrificeTwo" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-010", "BT1-011", "BT1-012"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sacrificeOneId = s.perm("sacrificeOne").permanentId;
    const sacrificeTwoId = s.perm("sacrificeTwo").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificeOneId)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificeTwoId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
