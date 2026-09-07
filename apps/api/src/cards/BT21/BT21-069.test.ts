import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-069.js";
import "../index.js";

describe("BT21-069 GulusGammamon", () => {
  it("preserves the Gammamon evolution route and residual-free coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Gammamon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("uses a Gammamon bottom-stack cost to delete a level 4 or lower Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
      });
      expect(action).toMatchObject({
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        isSecurity: true,
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityBattleEnded",
            once: true,
            actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false, from: ["trash"] })],
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      }),
    );
  });

  it("places a Gammamon from hand and deletes an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-069", as: "gulus" },
            { card: "BT21-010", as: "gammamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));

    const gulus = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-069");
    expect(gulus?.stack.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("publicly pays the On Play source from trash before deleting an eligible target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-069", as: "gulus" }], trash: [{ card: "BT21-010", as: "gammamon" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    const gulus = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-069");
    expect(gulus?.stack.some((card) => card.instanceId === s.inst("gammamon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gammamon").instanceId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it.each(["BT1-009", "BT21-069"])("refuses the exact Gammamon alternate from %s", async (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "nonGammamon" }], hand: [{ card: "BT21-069", as: "gulus" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const handId = s.inst("gulus").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonGammamon").permanentId,
        instanceId: handId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
    expect(s.perm("nonGammamon").topCard.cardId).toBe(base);
    expect(s.state.memory).toBe(3);
  });

  it("uses the printed alternate Gammamon evolution through a legal public stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-010", as: "rookie" }],
          hand: [
            { card: "BT21-069", as: "gulus" },
            { card: "BT21-010", as: "bottom-gammamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("gulus").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").topCard.cardId === "BT21-069");

    expect(s.state.memory).toBe(1);
    expect(s.perm("rookie").stack[0]?.instanceId).toBe(s.inst("bottom-gammamon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("also pays from trash during evolution and places the card at the true bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-069", as: "gulus", under: [{ card: "BT1-009", as: "existing" }] }],
          trash: [{ card: "BT21-010", as: "gammamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gulus"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("gulus").stack[0]?.instanceId).toBe(s.inst("gammamon").instanceId);
    expect(s.perm("gulus").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
  });

  it.each([
    ["declined", "BT21-010", true],
    ["nonmatching", "BT1-009", false],
  ] as const)("does not pay or delete when the cost is %s", async (_label, costCard, decline) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-069", as: "gulus" },
            { card: costCard, as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-069"));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it.each(["play", "digivolve"] as const)(
    "may pay the optional placement cost through public %s with only a level-5 target",
    async (route) => {
      const s = setupEngine(
        {
          0: {
            battleArea: route === "digivolve" ? [{ card: "BT21-010", as: "base" }] : [],
            hand: [
              { card: "BT21-069", as: "gulus" },
              { card: "BT21-010", as: "cost" },
            ],
            deck: ["BT1-001"],
          },
          1: { battleArea: [{ card: "BT2-075", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(
          0,
          route === "play"
            ? { type: "playCard", instanceId: s.inst("gulus").instanceId }
            : {
                type: "digivolve",
                permanentId: s.perm("base").permanentId,
                instanceId: s.inst("gulus").instanceId,
                alternateRequirementIndex: 0,
              },
        ),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) =>
            permanent.topCard.cardId === "BT21-069" &&
            permanent.stack.some((card) => card.instanceId === s.inst("cost").instanceId),
        ),
      );
      const gulus = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-069");
      expect(gulus?.stack[0]?.instanceId).toBe(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
      expect(s.perm("target").topCard.cardId).toBe("BT2-075");
      expect(s.state.memory).toBe(route === "play" ? 4 : 8);
    },
  );

  it("plays itself from security for free and grants inherited Retaliation", async () => {
    const security = setupEngine({ 0: { security: [{ card: "BT21-069", as: "gulus" }] } });
    security.state.memory = 0;
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("gulus"));
    await settle(() => security.state.players[0]!.battleArea.length === 1);
    expect(security.state.memory).toBe(0);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT21-076", as: "host", under: [{ card: "BT21-069", as: "source" }] }] },
    });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Retaliation")).toBe(true);
  });

  it("plays from Security only after the public security battle closes", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-069", as: "gulus" }] },
    });
    await s.ready();

    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(attack).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT21-069"));

    const checkedIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT21-069",
    );
    const playedIndex = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-069");
    const checked = s.events[checkedIndex] as { battle?: unknown } | undefined;
    expect(checkedIndex).toBeGreaterThanOrEqual(0);
    expect(checked?.battle).toBeDefined();
    expect(playedIndex).toBeGreaterThan(checkedIndex);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  it("inherits Retaliation through public evolution and deletes the winning battle opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-069", as: "source" }],
          hand: [{ card: "BT21-076", as: "evolution" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { battleArea: [{ card: "BT10-055", as: "winner", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sourceId = s.perm("source").topCard.instanceId;
    const winnerId = s.perm("winner").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-076");
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === winnerId)).toBe(true);
  });
});
