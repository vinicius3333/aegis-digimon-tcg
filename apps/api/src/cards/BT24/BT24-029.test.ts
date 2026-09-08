import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-029.js";
import "../index.js";

describe("BT24-029 Whamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-029")).toMatchObject({
      cardId: "BT24-029",
      nameEn: "Whamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sea Animal", "Iliad", "TS"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the qualifying hand card placement for both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as unknown as {
        kind: string;
        target: { filter: { kind: string[] } };
        cost: { kind: string; destination: string; position: string; target: { filter: { nameOrTrait: unknown } } };
        abortOnDecline: boolean;
      };
      expect(action.kind).toBe("Restrict");
      expect(action.target.filter.kind).toEqual(["Digimon", "Tamer"]);
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.abortOnDecline).toBe(true);
      expect(action.cost.target.filter.nameOrTrait).toEqual([
        { tokens: ["Sea Beast", "TS"], match: "trait" },
        { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
      ]);
    }
  });

  it("plays qualifying TS cards from its digivolution cards", () => {
    const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack")
      ?.actions?.[0] as unknown as {
      kind: string;
      from: string[];
      fromOwnDigivolutionStack: boolean;
      optional: boolean;
      target: { filter: unknown };
    };
    const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")
      ?.actions?.[0] as unknown as {
      kind: string;
      from: string[];
      fromOwnDigivolutionStack: boolean;
      optional: boolean;
      target: { filter: unknown };
    };
    expect(endOfAttack).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      optional: true,
    });
    expect(inherited).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      optional: true,
    });
    expect(inherited.target.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 }, colors: ["Blue"] });
  });

  it("accepts a cost-5 TS Tamer for Q5609 and applies the suspension restriction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-029", as: "whamon" },
            { card: "BT24-102", as: "placed" },
          ],
        },
        1: { battleArea: [{ card: "BT24-083", as: "restricted" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.perm("restricted").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("whamon").instanceId),
    );

    expect(s.perm("whamon").stack[0]?.instanceId).toBe(s.inst("placed").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("whamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("accepts an Aquatic card for Q5609's [Aqua] in any trait wording", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-029", as: "whamon" },
            { card: "BT15-025", as: "aquatic" },
          ],
        },
        1: { battleArea: [{ card: "BT24-083", as: "restricted" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aquatic").instanceId, s.perm("restricted").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("whamon").instanceId),
    );

    expect(s.perm("whamon").stack[0]?.instanceId).toBe(s.inst("aquatic").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("whamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("does not restrict suspension when the placement cost is unavailable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-029", as: "whamon" }] },
      1: { battleArea: [{ card: "BT24-083", as: "candidate" }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("whamon"));

    expect(observe(s.engine).isRestricted(s.perm("candidate"), "suspend")).toBe(false);
  });

  it("does not restrict when the public placement cost is unavailable", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-029", as: "whamon" }] },
      1: {
        battleArea: [{ card: "BT24-083", as: "candidate" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-029"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-029")).toBe(true);
    // The printed restriction cannot resolve when no legal placement card is available.
    expect(observe(s.engine).isRestricted(s.perm("candidate"), "suspend")).toBe(false);
  });

  it("rejects a matching cost-6 placement card at the public cost-5 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-029", as: "whamon" },
            { card: "BT24-022", as: "tooExpensive" },
          ],
        },
        1: { battleArea: [{ card: "BT24-083", as: "candidate" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("whamon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooExpensive").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("candidate"), "suspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a cost-5 TS card only from Whamon's own stack at end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-029", as: "whamon", under: [{ card: "BT24-083", as: "ownTarget" }] },
            { card: "BT24-030", as: "other", under: [{ card: "BT24-083", as: "otherTarget" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("whamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownTarget").instanceId,
      ),
    );

    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherTarget").instanceId);
  });

  it("plays the own stacked TS card from a natural public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-030", as: "host", under: [{ card: "BT24-027", as: "ownTarget" }, "BT24-029"] }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("ownTarget").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("ownTarget").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).not.toContain(s.inst("ownTarget").instanceId);
  });

  it("resets the inherited attack play on the owner's later turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-030",
              as: "host",
              under: [{ card: "BT24-027", as: "firstTarget" }, { card: "BT24-027", as: "secondTarget" }, "BT24-029"],
            },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstTarget").instanceId, s.inst("secondTarget").instanceId);
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstTarget").instanceId),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondTarget").instanceId),
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).not.toContain(s.inst("secondTarget").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });

  it("plays the own stacked TS card at the end of a natural public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-029", as: "whamon", under: [{ card: "BT24-083", as: "ownTarget" }] }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("whamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("ownTarget").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("ownTarget").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("publicly declines the optional End of Attack play without moving its source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-029", as: "whamon", under: [{ card: "BT24-083", as: "source" }] }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("whamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("whamon").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("source").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("source").instanceId);
  });

  it("inherited play is limited to a level-4 blue TS card in the attacking host's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "host", under: [{ card: "BT24-027", as: "ownTarget" }, "BT24-029"] },
            { card: "BT24-029", as: "other", under: [{ card: "BT24-027", as: "otherTarget" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownTarget").instanceId,
      ),
    );

    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherTarget").instanceId);
  });

  it("digivolves from a level 4 TS card for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "base" }],
        hand: [{ card: "BT24-029", as: "whamon" }],
        deck: [{ card: "BT1-013", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("whamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("whamon").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("whamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("digivolves from a normal blue level-4 source for the catalog cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "blueBase" }],
        hand: [{ card: "BT24-029", as: "whamon" }],
        deck: [{ card: "BT1-013", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("whamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("whamon").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("blueBase").stack.map((card) => card.instanceId)).toEqual([s.inst("blueBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("runs the qualifying placement and restriction on a public digivolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-010", as: "base" }],
          hand: [
            { card: "BT24-029", as: "whamon" },
            { card: "BT24-102", as: "placed" },
          ],
          deck: [{ card: "BT1-013", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT24-083", as: "restricted" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("whamon").instanceId, s.inst("placed").instanceId, s.perm("restricted").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("whamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("whamon").instanceId);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("whamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("placed").instanceId,
      s.inst("base").instanceId,
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
  });

  it("blocks a public suspend attempt until the opponent turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-029", as: "whamon" },
            { card: "BT24-102", as: "placed" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "restricted" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.perm("restricted").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("restricted"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const attackerId = s.perm("restricted").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: false,
      reason: "illegal-target",
    });
    expect(s.perm("restricted").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "suspend")).toBe(false);
  });
});
