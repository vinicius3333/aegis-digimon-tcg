import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-015.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-008.js";
import "./BT13-015.js";
import "../ST1/ST1-10.js";
import "../BT12/BT12-092.js";

describe("BT13-015 RizeGreymon", () => {
  it("uses exact bracketed names for its GeoGreymon evolution and Marcus Damon references", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
  });

  it("digivolves from GeoGreymon for 3 and may play Marcus Damon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId1 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(7);
  });

  it("plays Marcus Damon & Agumon through its name rule", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "AD1-021", as: "ruleMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId2 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId2));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId2);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-021"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ruleMarcus").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-021")).toHaveLength(
      1,
    );
    expect(s.state.memory).toBe(7);
  });

  it("may decline to play Marcus Damon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId3 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId3));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId3);
    await settle(() => s.perm("geo").topCard.cardId === "BT13-015");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it.each([false, true])(
    "places the exact deleted Marcus once per turn and resets (inherited=%s)",
    async (inherited) => {
      const preferredTargets: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "ST1-10", as: "host", under: [{ card: "BT13-015", as: "source" }] }
                : { card: "BT13-015", as: "host" },
              { card: "BT13-008", as: "agumon" },
              { card: "BT12-092", as: "first" },
              { card: "BT12-092", as: "second" },
              { card: "BT12-092", as: "third" },
            ],
            security: ["BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredTargets },
      );
      const firstId = s.inst("first").instanceId;
      const secondId = s.inst("second").instanceId;
      const thirdId = s.inst("third").instanceId;
      preferredTargets.push(firstId, thirdId);
      const sourceId = inherited ? s.inst("source").instanceId : s.perm("host").topCard.instanceId;
      s.state.memory = 10;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.perm("first").currentDP === 3000 && s.perm("second").currentDP === 3000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("first").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[0]!.security[0]!.instanceId).toBe(firstId);
      expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("second").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondId);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      s.state.turnSeat = 1;
      s.state.memory = -s.state.memory;
      await advance(s.engine).runTurn(1);
      s.state.turnSeat = 0;
      s.state.memory = -s.state.memory;
      const nextTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.perm("third").currentDP === 3000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("third").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(3);
      expect(s.state.players[0]!.security[0]!.instanceId).toBe(thirdId);
      expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
      expect(
        inherited ? s.perm("host").stack.map((card) => card.instanceId) : [s.perm("host").topCard.instanceId],
      ).toContain(sourceId);
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextTurn;
    },
  );
});
