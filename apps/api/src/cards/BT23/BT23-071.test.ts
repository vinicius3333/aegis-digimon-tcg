import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-071.js";

describe("BT23-071 Dullahamon", () => {
  it("matches every catalog field and compiles the printed exact-name digivolve route", () => {
    expect(getCardDefinition("BT23-071")).toMatchObject({
      cardId: "BT23-071",
      nameEn: "Dullahamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Ghost", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Phantomon"],
        controllerControls: { kind: ["Tamer"], namesExact: ["Violet Inboots"], min: 1 },
        cost: 6,
        isAlternate: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("exposes Piercing, Security Attack +1, and Execute through live seams", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-071", as: "dullahamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("dullahamon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("dullahamon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("dullahamon"), "Execute")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["Piercing", "SecurityAttack", "Execute"]);
  });

  it("digivolves from Phantomon for exactly 6 while a Violet Inboots Tamer is out, drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-065", as: "phantomon" },
            { card: "BT23-087", as: "inboots" },
          ],
          hand: [{ card: "BT23-071", as: "dullahamon" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const phantomonId = s.inst("phantomon").instanceId;
    const dullahamonId = s.inst("dullahamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: dullahamonId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("phantomon").topCard?.instanceId === dullahamonId && s.state.pendingDecision === undefined,
    );

    expect(s.perm("phantomon").topCard?.instanceId).toBe(dullahamonId);
    expect(s.perm("phantomon").stack.map((card) => card.instanceId)).toEqual([phantomonId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    // No opposing Digimon, so the [When Digivolving] deletion did nothing and the DP clause applies.
    expect(s.perm("phantomon").currentDP).toBe(19000);
  });

  it("refuses the cost-6 route without a Violet Inboots Tamer and leaves memory and hand untouched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-065", as: "phantomon" }],
        hand: [{ card: "BT23-071", as: "dullahamon" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-071"]);
    expect(s.perm("phantomon").topCard?.cardId).toBe("BT23-065");
  });

  it("does not count the opponent's Violet Inboots Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-065", as: "phantomon" }],
        hand: [{ card: "BT23-071", as: "dullahamon" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT23-087", as: "opponentInboots" }] },
    });
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
  });

  it("rejects MetalPhantomon: the printed [Phantomon] route is exact, not a substring", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-073", as: "metalPhantomon" },
          { card: "BT23-087", as: "inboots" },
        ],
        hand: [{ card: "BT23-071", as: "dullahamon" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 6;

    expect(getCardDefinition("BT20-073")).toMatchObject({ nameEn: "MetalPhantomon", level: 5 });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalPhantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("metalPhantomon").topCard?.cardId).toBe("BT20-073");
  });

  it("must delete the opponent's highest-level Digimon and then gets no DP bonus (Q5343)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-065", as: "phantomon" },
            { card: "BT23-087", as: "inboots" },
          ],
          hand: [{ card: "BT23-071", as: "dullahamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT23-069", as: "high" },
          ],
        },
      },
      // Declining every optional prompt proves the deletion is mandatory: Q5343 says a player
      // cannot skip the choice to satisfy "if this effect didn't delete".
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT23-069")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.perm("phantomon").currentDP).toBe(14000);
  });

  it("gets +5000 for the turn when the chosen highest-level Digimon prevents deletion (Q5344)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-065", as: "phantomon" },
            { card: "BT23-087", as: "inboots" },
          ],
          hand: [{ card: "BT23-071", as: "dullahamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-055", as: "protected" },
            { card: "BT23-100", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT23-100"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-055")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT23-100")).toBe(true);
    expect(s.perm("phantomon").currentDP).toBe(19000);
  });

  it("drops the +5000 at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-065", as: "phantomon" },
            { card: "BT23-087", as: "inboots" },
          ],
          hand: [{ card: "BT23-071", as: "dullahamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("phantomon").permanentId,
        instanceId: s.inst("dullahamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("phantomon").currentDP === 19000);
    expect(s.perm("phantomon").currentDP).toBe(19000);

    await advance(s.engine).runTurn(s.state.turnSeat);
    expect(s.perm("phantomon").currentDP).toBe(14000);
  });

  it("plays only an eligible level 6 or lower Ghost from your own trash on deletion, for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-071", as: "dullahamon" }],
          trash: [
            { card: "BT23-069", as: "ghost" },
            { card: "BT23-055", as: "nonGhost" },
          ],
        },
        1: { trash: [{ card: "BT23-064", as: "opponentGhost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const ghostId = s.inst("ghost").instanceId;

    // No public intent deletes an established 14000 DP Digimon on demand; the production
    // deletion verb is the narrowest seam that opens the [On Deletion] window.
    await advance(s.engine).verb.deletePermanent([s.perm("dullahamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nonGhost").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentGhost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // "without paying the cost": Necromon's play cost of 11 is never charged.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the [On Deletion] play and leave the Ghost in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-071", as: "dullahamon" }],
          trash: [{ card: "BT23-069", as: "ghost" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const ghostId = s.inst("ghost").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("dullahamon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ghostId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("compiles the [When Digivolving] and [On Deletion] clauses as printed", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
        count: 1,
      },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 5000,
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
      target: { filter: { isSelfRef: true } },
    });
    const onDeletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(onDeletion?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
        },
        count: 1,
      },
    });
  });
});
