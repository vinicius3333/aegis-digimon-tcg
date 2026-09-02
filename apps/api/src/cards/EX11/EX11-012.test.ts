import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-012 Medusamon", () => {
  it("encodes only Medusamon's printed clauses and leaves reminder text on the token", () => {
    const compiled = runtimeCompiledCard("EX11-012")!;

    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toEqual([
      { keyword: "Rush", raw: "＜Rush＞" },
      { keyword: "Progress", raw: "＜Progress＞" },
    ]);
    for (const trigger of ["WhenDigivolving", "EndOfAttack"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "PlayToken",
          tokens: ["Petrification Token"],
          count: 1,
          payCost: false,
          controller: "mine",
          placedAs: "opponentDigimon",
          cost: {
            kind: "return",
            target: { filter: { zone: "trash", controller: "opponent" }, count: 1 },
            to: "deckBottom",
          },
          optional: true,
          abortOnDecline: true,
        },
      ]);
    }
    expect(compiled.effects.some((effect) => effect.trigger === "OnDeletion")).toBe(false);
    expect(compiled.effects.some((effect) => effect.isInherited || effect.isSecurity)).toBe(false);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        event: "wouldLeavePlay",
        sourceFilter: { isSelfRef: true },
        cost: expect.objectContaining({ kind: "deleteOwn", target: { filter: { isToken: true }, count: 1 } }),
        actions: [{ kind: "Prevent", mode: "leavePlay" }],
      }),
    ]);
  });

  it("deletes within live DP, pays from opponent trash to deck bottom, and places their token (Q5800)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-010", as: "base" }],
          hand: [{ card: "EX11-012", as: "medusamon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "EX11-008", as: "victim" }],
          trash: [{ card: "BT1-009", as: "returnCost" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("returnCost").instanceId);
    const victimId = s.perm("victim").permanentId;
    const returnedId = s.inst("returnCost").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    const token = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token",
    )!;
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === returnedId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(returnedId);
    expect(token.controllerSeat).toBe(1);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("continues to the token clause when no opposing Digimon is within its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-010", as: "base" }],
          hand: [{ card: "EX11-012", as: "medusamon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "EX11-011", as: "tooLarge", dp: 13000 }],
          trash: [{ card: "BT1-009", as: "returnCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-011")).toBe(true);
    assertNoLoudGap(s);
  });

  it("finishes the token clause after an immediate leave reaction removes Medusamon (Q6045)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-010", as: "base" }],
          hand: [{ card: "EX11-012", as: "medusamon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "EX10-052", as: "reactor", dp: 1000 }],
          trash: [{ card: "BT1-009", as: "returnCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const medusamonId = s.perm("base").permanentId;
    preferred.push(medusamonId, s.inst("returnCost").instanceId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: medusamonId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX10-052")).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    ).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("returnCost").instanceId);
    assertNoLoudGap(s);
  });

  it("plays its own card as the opponent's Digimon through Crimson Blaze's play lock (Q5801)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-010", as: "base" }],
          hand: [
            { card: "BT8-097", as: "crimsonBlaze" },
            { card: "EX11-012", as: "medusamon" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "EX11-010", as: "victim", dp: 7000 }],
          trash: [{ card: "BT1-009", as: "returnCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("returnCost").instanceId);
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves the same delete-and-token sequence at end of attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-012", as: "medusamon" }] },
        1: {
          battleArea: [{ card: "EX11-008", as: "victim" }],
          trash: [{ card: "BT1-009", as: "returnCost" }],
          security: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("returnCost").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medusamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-008")).toBe(false);
    assertNoLoudGap(s);
  });

  it("has live Rush and Progress and can attack on the turn it is played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX11-012", as: "medusamon" }] },
        1: { security: ["BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnCount = 1;
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medusamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-012"));
    const medusamon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX11-012")!;

    expect(observe(s.engine).hasKeyword(medusamon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(medusamon, "Progress")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: medusamon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("may delete a Token to prevent deletion, then leaves when no Token remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-012", as: "medusamon" },
            { card: "TOKEN-Familiar-Token", as: "costToken" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const medusamonId = s.perm("medusamon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([medusamonId], "byRule")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar"))).toBe(
      false,
    );

    expect(await advance(s.engine).verb.deletePermanent([medusamonId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("may pay the unpossessived prevention cost with an opponent's Token", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-012", as: "medusamon" }] },
        1: { battleArea: [{ card: "TOKEN-Petrification-Token", as: "costToken" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const medusamonId = s.perm("medusamon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([medusamonId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("may decline the leave prevention without deleting the available Token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-012", as: "medusamon" },
            { card: "TOKEN-Familiar-Token", as: "costToken" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const medusamonId = s.perm("medusamon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([medusamonId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar"))).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("also prevents a return-to-hand leave by deleting a Token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-012", as: "medusamon" },
            { card: "TOKEN-Familiar-Token", as: "costToken" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const medusamonId = s.perm("medusamon").permanentId;
    const medusamonInstanceId = s.inst("medusamon").instanceId;

    await advance(s.engine).verb.returnToHand([medusamonInstanceId]);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === medusamonInstanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar"))).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it("can repeatedly prevent 0-DP rule deletion while Tokens remain (Q6514)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-012", as: "medusamon" }] },
        1: {
          battleArea: [
            { card: "BT2-033", as: "yellowSource" },
            { card: "TOKEN-Petrification-Token", as: "tokenA" },
            { card: "TOKEN-Petrification-Token", as: "tokenB" },
          ],
          hand: [{ card: "BT2-099", as: "dpReduction" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const medusamonId = s.perm("medusamon").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 9;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dpReduction").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === medusamonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-033"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("rejects normal evolution from a non-red level 5", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "blueBase" }],
        hand: [{ card: "EX11-012", as: "medusamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
