import { getCardDefinition, getCompiledCard, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-012.js";
import "./EX3-018.js";
import "./EX3-065.js";
import "../BT1/BT1-035.js";
import "../BT23/BT23-084.js";
import "../BT23/BT23-101.js";

describe("EX3-012 Volcanicdramon", () => {
  it("has its official identity and both printed evolution colors", () => {
    expect(getCardDefinition("EX3-012")).toMatchObject({
      cardId: "EX3-012",
      nameEn: "Volcanicdramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Earth Dragon"],
      rarity: "SR",
      imageId: "EX3-012",
      effectText:
        "[On Play] Delete all of your opponent's Digimon with the lowest DP. If no Digimon is deleted by this effect, your opponent can't play Digimon with 5000 DP or less until the end of their turn.[When Attacking] If you have a Tamer in play, trash the top card of your opponent's security stack.",
    });
  });

  it("publishes the deletion, conditional play lock, and inherited security clause as complete IR", () => {
    expect(getCompiledCard("EX3-012")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
                count: "all",
              },
            },
            {
              kind: "RestrictPlay",
              seat: "opponent",
              filter: { kind: ["Digimon"], dpAtMost: 5000 },
              mode: "play",
              duration: "untilOpponentTurnEnd",
              condition: { kind: "ifThisEffectDidNotDelete" },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["red", "BT1-020"],
    ["black", "BT10-064"],
  ])("evolves from a %s level 5 for the printed cost", async (_color, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "EX3-012", as: "volcanicdramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-012");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCardId]);
    expect(s.state.memory).toBe(1);
  });

  it("rejects a blue level 5 source and keeps Volcanicdramon in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "base" }],
        hand: [{ card: "EX3-012", as: "volcanicdramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-012");
    expect(s.state.memory).toBe(5);
  });

  it("deletes every opposing Digimon tied for the lowest DP and does not restrict play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-012", as: "volcanicdramon" }] },
      1: {
        hand: [{ card: "BT1-009", as: "smallPlay" }],
        battleArea: [
          { card: "BT1-009", as: "lowestA", dp: 3000 },
          { card: "BT1-013", as: "lowestB", dp: 3000 },
          { card: "BT1-019", as: "higher", dp: 6000 },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const deletedIds = [s.perm("lowestA").topCard.instanceId, s.perm("lowestB").topCard.instanceId];
    const survivorId = s.perm("higher").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => deletedIds.every((id) => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === id)));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("smallPlay").instanceId })).toEqual({
      ok: true,
    });
  });

  it("uses the actual deletion receipt after Evade to arm the play prohibition", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-012", as: "volcanicdramon" }] },
      1: {
        battleArea: [{ card: "EX3-018", as: "evader" }],
        hand: [{ card: "BT1-013", as: "atLimit" }],
      },
    });
    s.state.memory = 12;
    await s.ready();
    const evaderId = s.perm("evader").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondEvade",
        permanentId: evaderId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.some(
          ({ permanentId, isSuspended }) => permanentId === evaderId && isSuspended,
        ) &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-012") &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-012"),
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === evaderId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("atLimit").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
  });

  it("enforces the exact 5000-DP boundary and expires through public opponent-turn completion", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-012", as: "volcanicdramon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        hand: [
          { card: "BT1-013", as: "atLimit" },
          { card: "BT1-071", as: "aboveLimit" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-012") &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-012"),
    );
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("atLimit").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("aboveLimit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-071"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextControllerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextControllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("atLimit").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-013"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("trashes one security before its normal check when attacking with a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-021", under: ["EX3-012"], as: "attacker" },
          { card: "EX3-065", as: "hina" },
        ],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();
    const trashedByEffectId = s.state.players[1]!.security[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    const effectTrashIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        event.from === Zone.Security &&
        event.to === Zone.Trash &&
        event.instanceIds.includes(trashedByEffectId),
    );
    const normalCheckIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(effectTrashIndex).toBeGreaterThanOrEqual(0);
    expect(normalCheckIndex).toBeGreaterThan(effectTrashIndex);
  });

  it("does not trash extra security when attacking without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-012", as: "attacker" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("Earth Dragon trait: Hina reactivates its On Play effect after digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-011", as: "base" },
            { card: "EX3-065", as: "hina" },
          ],
          hand: [{ card: "EX3-012", as: "volcanicdramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000 },
            { card: "BT1-013", dp: 3000 },
            { card: "BT1-019", as: "survivor", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const survivorId = s.perm("survivor").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);
    expect(s.perm("hina").isSuspended).toBe(true);
  });

  it("Q3430: two Hinas activate this card's On Play effect one at a time", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "firstHina" },
            { card: "EX3-065", as: "secondHina" },
            { card: "BT1-020", as: "base" },
          ],
          hand: [{ card: "EX3-012", as: "volcanicdramon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstHina").isSuspended && s.perm("secondHina").isSuspended);

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")).toHaveLength(2);
    expect(s.perm("firstHina").isSuspended).toBe(true);
    expect(s.perm("secondHina").isSuspended).toBe(true);
  });

  it("Q3431: a deleted Digimon's On Deletion resolves before the second Hina activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-065", as: "firstHina" },
            { card: "EX3-065", as: "secondHina" },
            { card: "BT1-020", as: "base" },
          ],
          hand: [{ card: "EX3-012", as: "volcanicdramon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-035", dp: 5000, as: "leomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("volcanicdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-035"));
    await settle(() => s.perm("firstHina").isSuspended && s.perm("secondHina").isSuspended);

    expect(s.state.memory).toBe(-2);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-035")).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-065" && req.kind === "optional")).toHaveLength(2);
  });

  it("Q6508: the opponent cannot play a <=5000 Digimon into breeding while restricted", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX3-012", as: "volcanicdramon" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [{ card: "EX3-018", as: "evader" }],
          hand: [
            { card: "BT23-084", as: "erika" },
            { card: "BT23-101", as: "hudie" },
            { card: "BT23-026", as: "lopmon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondEvade",
        permanentId: s.perm("evader").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-012"));
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-018")).toBe(true);

    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("erika").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT23-084"));
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("hudie").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT23-101"));
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;

    expect(s.state.players[1]!.breeding).toBeUndefined();
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("lopmon").instanceId);
  });
});
