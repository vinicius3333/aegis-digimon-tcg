import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT23-102.js";
import "../index.js";
import { observe } from "../../engine/testkit/observe.js";

// Fixture cards used as the printed DNA materials and the named Partition sources:
//   ST10-05  Angewomon   — Yellow Lv.5, [Angewomon]
//   BT23-067 LadyDevimon — Purple Lv.5, [LadyDevimon], [CS] trait
//   BT22-023 AeroVeedramon — Blue Lv.5 with the [CS] trait: the alternate-cost-5 base
//   BT1-040  WereGarurumon — Blue Lv.5 with NO [CS] trait: the illegal base
describe("BT23-102 Mastemon", () => {
  it("matches every catalog field, keyword, and complete compiled clause", () => {
    expect(getCardDefinition("BT23-102")).toMatchObject({
      cardId: "BT23-102",
      nameEn: "Mastemon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Angel", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword)).toEqual([
      "Barrier",
      "Partition",
    ]);
  });

  it("carries both printed cost headers and publishes them to the shared requirement readers", () => {
    // "[Digivolve] Lv.5 w/[CS] trait: Cost 5" and "[DNA Digivolve] Yellow Lv.5 + purple Lv.5: Cost 0".
    // `traits` is EXACT (CR 2-3-2-3): a substring gate would also accept "Abadin Electronics".
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 5, isAlternate: true }]);
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
    ]);
    expect(digivolutionRequirementsFor("BT23-102")).toEqual(compiled.digivolutionRequirement);
    expect(dnaDigivolutionRequirementsFor("BT23-102")).toEqual(compiled.dnaDigivolveRequirement);
  });

  it("compiles the When Digivolving free play and the conditional both-player security trim", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")!;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
      target: {
        filter: {
          kind: ["Digimon"],
          colors: ["Yellow", "Purple"],
          levelComparison: { op: "lte", value: 5 },
        },
      },
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      bothPlayers: true,
      leaveCount: 3,
      condition: { kind: "selfDigivolutionStackHasSameLevelPair" },
    });
  });

  it("compiles the All Turns once-per-turn placement with an either-controller Digimon source", () => {
    const trigger = compiled.effects.find((entry) => entry.trigger === "AllTurns")!;
    expect(trigger.frequency).toBe("OncePerTurn");
    expect((trigger.actions[0] as { event: string }).event).toBe("whenSecurityRemoved");
    expect((trigger.actions[0] as { actions: unknown[] }).actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addBottom",
      controller: "any",
      optional: true,
      source: { filter: { isDigimon: true, controller: "any" } },
    });
  });

  // --- Public evolution routes -------------------------------------------------------

  it("DNA digivolves publicly from a yellow Lv.5 and a purple Lv.5 at cost 0, and the two Lv.5 sources trim both security stacks to 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow" },
            { card: "BT23-067", as: "purple" },
          ],
          hand: [{ card: "BT23-102", as: "mastemon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011"],
          security: 5,
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: 5 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    const yellowId = s.inst("yellow").instanceId;
    const purpleId = s.inst("purple").instanceId;
    const mastemonId = s.inst("mastemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
        instanceId: mastemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === mastemonId));

    const merged = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === mastemonId)!;
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(merged.stack.map(({ instanceId }) => instanceId).sort()).toEqual([yellowId, purpleId].sort());
    // Printed DNA cost 0: the merge pays nothing.
    expect(s.state.memory).toBe(0);
    // The DNA stack holds two Lv.5 cards, so the conditional tail trims both stacks to 3.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("digivolves publicly from a Blue Lv.5 [CS] base only on the alternate cost-5 route", async () => {
    const board = () =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT22-023", as: "base" }],
            hand: [{ card: "BT23-102", as: "mastemon" }],
            deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
            security: 3,
          },
          1: { deck: ["BT1-009", "BT1-010"], security: 3 },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );

    // Memory 7 -> 2 pins the paid amount at exactly 5 (a "to zero" assertion would pass for
    // any cost >= the starting memory: the rules let memory go negative).
    const s = board();
    await s.ready();
    s.state.memory = 7;
    const baseId = s.inst("base").instanceId;
    const mastemonId = s.inst("mastemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: mastemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === mastemonId);
    expect(s.perm("base").topCard.cardId).toBe("BT23-102");
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(2);
    // Digivolution draws 1.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    // One Lv.5 card in the stack is not a same-level PAIR: no trim.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("refuses every route from a Blue Lv.5 base without the [CS] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-040", as: "base" }],
        hand: [{ card: "BT23-102", as: "mastemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 10;
    for (const extra of [{}, { useAlternateCost: true }, { useAlternateCost: true, alternateRequirementIndex: 0 }]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("mastemon").instanceId,
          ...extra,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(s.state.memory).toBe(10);
    expect(s.perm("base").topCard.cardId).toBe("BT1-040");
  });

  it("refuses a DNA pair that is not yellow Lv.5 plus purple Lv.5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST10-05", as: "yellowA" },
          { card: "BT23-031", as: "yellowB" },
        ],
        hand: [{ card: "BT23-102", as: "mastemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("yellowA").permanentId, s.perm("yellowB").permanentId],
      instanceId: s.inst("mastemon").instanceId,
    });
    expect(result).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(10);
  });

  // --- [When Digivolving]: the free play ---------------------------------------------

  function dnaBoard(
    seatZero: Record<string, unknown>,
    seatOne: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow" },
            { card: "BT23-067", as: "purple" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          ...seatZero,
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], ...seatOne },
      } as never,
      options as never,
    );
  }

  async function dnaInto(s: ReturnType<typeof setupEngine>) {
    await s.ready();
    s.state.memory = 0;
    const mastemonId = s.inst("mastemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
        instanceId: mastemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === mastemonId));
    await settle(() => s.state.pendingDecision === undefined);
    return mastemonId;
  }

  it("plays a level 5 or lower yellow card from hand for free", async () => {
    const s = dnaBoard(
      {
        hand: [
          { card: "BT23-102", as: "mastemon" },
          { card: "BT23-031", as: "fromHand" },
        ],
        security: 5,
      },
      { security: 5 },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    const playedId = s.inst("fromHand").instanceId;
    await dnaInto(s);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(playedId);
    // "Without paying the cost": BT23-031 costs 7, memory stays where the DNA merge left it.
    expect(s.state.memory).toBe(0);
  });

  it("plays a level 5 or lower purple card from the trash for free", async () => {
    const s = dnaBoard(
      { hand: [{ card: "BT23-102", as: "mastemon" }], trash: [{ card: "BT23-066", as: "fromTrash" }], security: 5 },
      { security: 5 },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const playedId = s.inst("fromTrash").instanceId;
    await dnaInto(s);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(playedId);
    expect(s.state.memory).toBe(0);
  });

  it("refuses a level 6 card and an off-color card, and still performs the mandatory trim", async () => {
    const s = dnaBoard(
      {
        // BT23-034 is level 6; BT23-046 is green. Neither matches "level 5 or lower yellow or purple".
        hand: [
          { card: "BT23-102", as: "mastemon" },
          { card: "BT23-034", as: "tooHigh" },
          { card: "BT23-046", as: "offColor" },
        ],
        security: 5,
      },
      { security: 5 },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.inst("tooHigh").instanceId;
    const offId = s.inst("offColor").instanceId;
    const mastemonId = await dnaInto(s);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([highId, offId]),
    );
    expect(
      s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId).filter((id) => id === highId || id === offId),
    ).toEqual([]);
    // The trim is not optional: it runs even though the optional play found nothing.
    expect(s.state.players[1]!.security).toHaveLength(3);
    // Its own trim removes cards from security, so Mastemon's [All Turns] watcher opens and
    // (auto-accepted here) places Mastemon itself at the bottom: 3 kept cards + itself.
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(mastemonId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("declines the optional play but still applies the mandatory trim", async () => {
    const s = dnaBoard(
      {
        hand: [
          { card: "BT23-102", as: "mastemon" },
          { card: "BT23-031", as: "declined" },
        ],
        security: 5,
      },
      { security: 5 },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const declinedId = s.inst("declined").instanceId;
    await dnaInto(s);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(declinedId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  // --- The trim's security-count boundaries ------------------------------------------

  it.each([
    [2, 2],
    [3, 3],
    [4, 3],
  ])("leaves a %i-card stack at %i cards", async (before, after) => {
    const s = dnaBoard(
      { hand: [{ card: "BT23-102", as: "mastemon" }], security: before },
      { security: before },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await dnaInto(s);
    expect(s.state.players[0]!.security).toHaveLength(after);
    expect(s.state.players[1]!.security).toHaveLength(after);
  });

  it("trashes the exact top cards of both stacks, keeping the bottom three in order", async () => {
    const s = dnaBoard(
      {
        hand: [{ card: "BT23-102", as: "mastemon" }],
        security: [
          { card: "BT1-009", as: "myTop" },
          { card: "BT1-010", as: "mySecond" },
          { card: "BT1-011", as: "myThird" },
          { card: "BT1-012", as: "myFourth" },
          { card: "BT1-013", as: "myFifth" },
        ],
      },
      {
        security: [
          { card: "BT1-009", as: "theirTop" },
          { card: "BT1-010", as: "theirSecond" },
          { card: "BT1-011", as: "theirThird" },
          { card: "BT1-012", as: "theirFourth" },
        ],
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const ids = Object.fromEntries(
      [
        "myTop",
        "mySecond",
        "myThird",
        "myFourth",
        "myFifth",
        "theirTop",
        "theirSecond",
        "theirThird",
        "theirFourth",
      ].map((alias) => [alias, s.inst(alias).instanceId]),
    );
    await dnaInto(s);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      ids.myThird,
      ids.myFourth,
      ids.myFifth,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([ids.myTop, ids.mySecond]),
    );
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      ids.theirSecond,
      ids.theirThird,
      ids.theirFourth,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(ids.theirTop);
  });

  // --- [All Turns] [Once Per Turn] placement -----------------------------------------

  it("offers the placement on a natural security check during its controller's turn", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-102", as: "mastemon" },
            { card: "BT1-010", as: "attacker" },
          ],
          security: [{ card: "BT1-009", as: "checked" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: [{ card: "BT1-009", as: "theirCard" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    await s.ready();
    preferredIds.push(s.perm("attacker").permanentId, s.perm("attacker").topCard.instanceId);
    const attackerId = s.perm("attacker").topCard.instanceId;
    const theirCardId = s.inst("theirCard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    // The opponent's security card was checked and removed, which fires the watcher.
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).not.toContain(theirCardId);
    const placed = s.state.players[0]!.security.concat(s.state.players[1]!.security);
    expect(placed.map(({ instanceId }) => instanceId)).toContain(attackerId);
  });

  it("offers the placement on a security check during the opponent's turn and resets on the next turn", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon" }],
          // 2000-DP security Digimon: a 3000-DP attacker survives every security battle, so the
          // only thing that removes an attacker from the board is Mastemon's own placement.
          security: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-012", as: "second" },
            { card: "BT1-010", as: "third" },
          ],
          hand: ["BT1-009"],
          deck: Array(10).fill("BT1-011"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerA" },
            { card: "BT1-009", as: "attackerB" },
          ],
          hand: ["BT1-009"],
          deck: Array(10).fill("BT1-011"),
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    preferredIds.push(s.perm("attackerA").permanentId, s.perm("attackerA").topCard.instanceId);
    const attackerAId = s.perm("attackerA").topCard.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === attackerAId));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(attackerAId);

    // Second removal in the SAME turn: the once-per-turn cap refuses another placement.
    preferredIds.length = 0;
    preferredIds.push(s.perm("attackerB").permanentId, s.perm("attackerB").topCard.instanceId);
    const attackerBId = s.perm("attackerB").topCard.instanceId;
    const beforeSecond = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length !== beforeSecond || s.state.phase !== undefined);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(attackerBId);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).not.toContain(attackerBId);

    // Next turn the use resets: a fresh removal accepts a placement again.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    preferredIds.length = 0;
    preferredIds.push(s.perm("attackerB").permanentId, s.perm("attackerB").topCard.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === attackerBId));
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(attackerBId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets a [Security] effect activate before the removal watcher offers its placement (Q5390)", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-102", as: "mastemon" },
            { card: "BT1-010", as: "attacker" },
          ],
          security: [{ card: "BT1-009", as: "mine" }],
          deck: ["BT1-011", "BT1-012"],
        },
        // BT24-039 Ceresmon: "[Security] If your opponent has a level 6 or higher Digimon,
        // play this card without battling and without paying the cost." — a [Security] effect
        // that activates IMMEDIATELY on the check. Mastemon is the required level 6.
        1: { security: [{ card: "BT24-039", as: "securityCard" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    await s.ready();
    preferredIds.push(s.perm("attacker").permanentId, s.perm("attacker").topCard.instanceId);
    const securityCardId = s.inst("securityCard").instanceId;
    const attackerId = s.perm("attacker").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    // The [Security] effect activated without pending activation: Ceresmon is on its own board.
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === securityCardId)).toBe(true);
    // Mastemon's removal watcher still resolved, placing the attacker at the bottom of security.
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(attackerId);
    // Precedence: the [Security] play is emitted BEFORE the removal watcher triggers.
    const securityPlayIndex = s.events.findIndex(
      (event) => event.kind === "cardPlayed" && (event as { cardId?: string }).cardId === "BT24-039",
    );
    const watcherIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectTriggered" &&
        (event as { sourceCardId?: string }).sourceCardId === "BT23-102" &&
        (event as { timing?: string }).timing === "whenSecurityRemoved",
    );
    expect(securityPlayIndex).toBeGreaterThanOrEqual(0);
    expect(watcherIndex).toBeGreaterThan(securityPlayIndex);
  });

  it("places the opponent's Digimon into the chosen security stack, moving the physical card out of the battle area", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon" }],
          security: [{ card: "BT1-009", as: "ownTop" }],
        },
        1: { battleArea: [{ card: "BT23-067", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    await s.ready();
    const opponentId = s.perm("opponentDigimon").topCard!.instanceId;
    preferredIds.push(s.perm("opponentDigimon").permanentId, opponentId);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === opponentId));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(opponentId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(opponentId);

    // Once per turn: a second removal window offers nothing.
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("can place itself in its controller's security without opening a Partition replacement (Q5392)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-102", as: "mastemon" }], security: [{ card: "BT1-009", as: "ownTop" }] },
        1: { deck: ["BT1-009", "BT1-010"], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mastemonId = s.perm("mastemon").topCard!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === mastemonId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(mastemonId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(mastemonId);
  });

  // --- Keywords ----------------------------------------------------------------------

  it("exposes Barrier and Partition on a public Mastemon permanent", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-102", as: "direct" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("direct"), "Barrier")).toBe(true);
    expect(observe(direct.engine).hasKeyword(direct.perm("direct"), "Partition")).toBe(true);
  });

  it("uses Barrier in real combat by trashing exactly one security card", async () => {
    // Paying ＜Barrier＞ removes a card from this player's own security stack, which reaches the
    // "when security stacks are removed from" bus and offers Mastemon's own [All Turns] option.
    // Decline it: this test is about the Barrier cost.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon", suspended: true }],
          security: [{ card: "BT1-009", as: "barrierCost" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT23-034", as: "attacker" }], deck: ["BT1-009"], security: 3 },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // The Active phase unsuspends the board at the start of each own turn, so arm the
    // suspension AFTER the opponent's Main phase opens: an attack needs a suspended target.
    s.perm("mastemon").isSuspended = true;
    const barrierCostId = s.inst("barrierCost").instanceId;
    const mastemonId = s.perm("mastemon").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("mastemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "barrier" || s.events.some((e) => e.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("mastemon").permanentId, accept: true }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === mastemonId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(barrierCostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(barrierCostId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses Barrier and lets the battle deletion stand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon", suspended: true }],
          security: [{ card: "BT1-009", as: "kept" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT23-034", as: "attacker" }], deck: ["BT1-009"], security: 3 },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.perm("mastemon").isSuspended = true;
    const mastemonId = s.perm("mastemon").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("mastemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("mastemon").permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === mastemonId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses Partition to replay exact Angewomon and LadyDevimon sources on effect deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-102", as: "mastemon", under: ["ST10-05", "BT23-067"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // ＜Partition＞ never triggers on the controller's OWN effect, so the deletion must resolve
    // as the opponent's effect: seat 1 is the resolving seat.
    s.state.turnSeat = 1;
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("mastemon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId).sort()).toEqual(["BT23-067", "ST10-05"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT23-102");
  });
});
