import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT13-018.js";
import "../BT12/BT12-092.js";
import "../BT2/BT2-108.js";
import "./BT13-095.js";
import "../BT17/BT17-087.js";
import "../BT18/BT18-059.js";
import "../BT19/BT19-029.js";
import "../BT4/BT4-092.js";
import "../EX4/EX4-068.js";
import "../EX5/EX5-069.js";
import "../EX8/EX8-029.js";
import "../ST7/ST7-10.js";
import { compiled } from "./BT13-020.js";

describe("BT13-020 ShineGreymon: Burst Mode", () => {
  it("is fully represented in compiled IR with the printed Burst Digivolve requirement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["ShineGreymon"],
        cost: 0,
        isAlternate: true,
        burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
      },
    ]);
    expect(JSON.stringify(compiled)).not.toContain('"tokens":["Marcus Damon"],"match":"name"');
    expect(JSON.stringify(compiled)).toContain('"tokens":["Marcus Damon"],"match":"nameExact"');
  });

  it("plays and binds Marcus for the temporary 12000 DP Digimon treatment", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions).toEqual([
      expect.objectContaining({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        bindResultAs: "playedMarcus",
      }),
      expect.objectContaining({
        kind: "GrantStatic",
        target: { filter: { boundRef: "playedMarcus" }, count: 1 },
        grant: "kind",
        staticEffect: { kind: "SetBaseDP", value: 12000, keyword: "Rush", restriction: "digivolve" },
      }),
    ]);
  });

  it("does not accept a near-name Marcus Damon as the Burst Digivolve return cost", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "AD1-021", as: "nearMarcus" },
        ],
        hand: [{ card: "BT13-020", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea).toContain(s.perm("nearMarcus"));
  });

  it("rejects a longer ShineGreymon name even when an exact Marcus Damon is payable", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-074", as: "ruinMode" },
          { card: "BT12-092", as: "marcus" },
        ],
        hand: [{ card: "BT13-020", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ruinMode").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea).toContain(s.perm("ruinMode"));
    expect(s.state.players[0]!.battleArea).toContain(s.perm("marcus"));
  });

  it("declares the once-per-turn allied Tamer suspension security effect", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({ event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"] } }),
          ],
        }),
      ]),
    );
  });

  it("executes Burst Digivolve, returns one Marcus, and plays the other as a temporary 12000 DP Digimon with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "fieldMarcus" },
          ],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(9);
    const fieldMarcusId = s.perm("fieldMarcus").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) =>
            permanent.topCard?.cardId === "BT12-092" &&
            permanent.permanentId !== fieldMarcusId &&
            permanent.currentDP === 12000,
        ),
      3000,
    );
    const playedMarcus = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT12-092" && permanent.permanentId !== fieldMarcusId,
    )!;
    expect(playedMarcus.currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(playedMarcus, "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(playedMarcus, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT12-092")).toHaveLength(1);

    const priorTopId = s.perm("shine").stack.at(-1)?.instanceId;
    expect(priorTopId).toBeDefined();
    expect(s.state.memory).toBe(9);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("shine").topCard.instanceId).toBe(priorTopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("burst").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(priorTopId);
  });

  it("may decline to play Marcus Damon after a normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-018", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId1 = s.perm("shine").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shine").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("shine").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("shine").topCard.cardId === "BT13-020");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("trashes one security before each fresh public Marcus attack, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "firstMarcus" },
            { card: "BT12-092", as: "secondMarcus" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          security: [
            { card: "BT1-010", as: "securityOne" },
            { card: "BT1-011", as: "securityTwo" },
            { card: "BT1-012", as: "securityThree" },
            { card: "BT1-010", as: "securityFour" },
            { card: "BT1-011", as: "securityFive" },
            { card: "BT1-012", as: "securitySix" },
            { card: "BT1-010", as: "securitySeven" },
            { card: "BT1-011", as: "securityEight" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstMarcus").topCard.instanceId, s.perm("secondMarcus").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("firstMarcus").currentDP === 3000 && s.perm("secondMarcus").currentDP === 3000);
    expect(s.perm("firstMarcus").currentDP).toBe(3000);
    expect(s.perm("secondMarcus").currentDP).toBe(3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 6 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOne").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityTwo").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 5 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityThree").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("securityFour").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityFour").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trash security for an allied Tamer suspension on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-020", as: "burst" },
          { card: "BT12-092", as: "marcus" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("marcus").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT13-020 ShineGreymon: Burst Mode — KB Q&A rulings", () => {
  const fillerDeck = () => Array.from({ length: 5 }, () => "BT1-010");

  async function digivolveIntoBurstMode(s: EngineSetup, marcusAlias: string) {
    const marcusInstanceId = s.inst(marcusAlias).instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusInstanceId),
    );
    await settle(() => !s.state.pendingDecision);
    return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === marcusInstanceId)!;
  }

  function attackPlayer(s: EngineSetup, permanentId: string) {
    return s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } });
  }

  it("lets the Tamer it treats as a Digimon attack like a Digimon, while an untreated Tamer cannot (Q2278)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST7-10", as: "shine" },
            { card: "BT4-092", as: "plainMarcus" },
          ],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
            { card: "BT17-087", as: "noRushMarcus" },
          ],
          deck: fillerDeck(),
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: fillerDeck() },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const treatedMarcus = await digivolveIntoBurstMode(s, "handMarcus");
    expect(treatedMarcus.currentDP).toBe(12000);
    expect(attackPlayer(s, s.perm("plainMarcus").permanentId)).toMatchObject({ ok: false });

    // BT17-087 treats itself as a Digimon on the turn it is played but grants no <Rush>,
    // so only BT13-020's <Rush> lets its Marcus attack on the turn it was played.
    const noRushInstanceId = s.inst("noRushMarcus").instanceId;
    preferred.push(noRushInstanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: noRushInstanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === noRushInstanceId && permanent.currentDP === 3000,
      ),
    );
    await settle(() => !s.state.pendingDecision);
    const noRushMarcus = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === noRushInstanceId,
    )!;
    expect(noRushMarcus.currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(noRushMarcus, "Rush")).toBe(false);
    expect(attackPlayer(s, noRushMarcus.permanentId)).toMatchObject({ ok: false });

    expect(attackPlayer(s, treatedMarcus.permanentId)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < 3 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).hasAttackedThisTurn(treatedMarcus)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("keeps the Tamer it treats as a Digimon a Tamer, so its suspension still triggers the Tamer watcher (Q2279)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
          ],
          deck: fillerDeck(),
        },
        1: {
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-010", as: "checkedSecurity" },
            { card: "BT1-010", as: "remainingSecurity" },
          ],
          deck: fillerDeck(),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const treatedMarcus = await digivolveIntoBurstMode(s, "handMarcus");
    expect(attackPlayer(s, treatedMarcus.permanentId)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("topSecurity").instanceId, s.inst("checkedSecurity").instanceId]),
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("does not arm the opponent's Biting Crush <Delay>, because Marcus is played as a Tamer, not as a Digimon (Q3677)", async () => {
    // Seat 0 owns Biting Crush and passes its turn first, so the <Delay> is usable on seat 1's turn.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-069", as: "bitingCrush" }],
          trash: [{ card: "EX5-063", as: "leviamon" }],
          deck: fillerDeck(),
          security: 3,
        },
        1: {
          battleArea: [
            { card: "ST7-10", as: "shine" },
            { card: "BT2-069", as: "purpleSource" },
          ],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
            { card: "BT2-108", as: "nightRaid" },
          ],
          trash: [{ card: "BT2-067", as: "demiDevimon" }],
          deck: fillerDeck(),
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    s.state.memory = 10;

    const marcusInstanceId = s.inst("handMarcus").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === marcusInstanceId && permanent.currentDP === 12000,
      ),
    );
    await settle(() => !s.state.pendingDecision);
    await settle();
    const bitingCrushInPlay = () =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("bitingCrush").instanceId,
      );
    const leviamonInTrash = () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("leviamon").instanceId);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX5-069")).toBe(false);
    expect(bitingCrushInPlay()).toBe(true);
    expect(leviamonInTrash()).toBe(true);

    // Near-miss control: an effect that plays a real Digimon does fire the same <Delay>.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("nightRaid").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("demiDevimon").instanceId,
      ),
    );
    await settle(() => !leviamonInTrash());
    await settle();
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX5-069")).toBe(true);
    expect(bitingCrushInPlay()).toBe(false);
    expect(leviamonInTrash()).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-063")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  async function aegisdramonDpAfterMarcusSuspends(
    bringMarcusIntoPlay: (s: EngineSetup, marcusInstanceId: string) => Promise<unknown>,
  ) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT13-095", as: "handMarcus" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Both paths pay 5 from 3 memory, leaving the opponent at 2: Aegisdramon's immunity is on
    // and its "1 or less memory" On Play lock is off.
    s.state.memory = 3;
    await s.ready();
    const marcusInstanceId = s.inst("handMarcus").instanceId;
    await bringMarcusIntoPlay(s, marcusInstanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === marcusInstanceId && permanent.isSuspended,
      ),
    );
    await settle();
    const marcus = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === marcusInstanceId,
    )!;
    return { marcusDp: marcus.currentDP, aegisdramonDp: s.perm("aegisdramon").currentDP, memory: s.state.memory };
  }

  const playedFromHand = async (s: EngineSetup, marcusInstanceId: string) =>
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: marcusInstanceId })).toEqual({ ok: true });
  const playedByBurstMode = (s: EngineSetup) => digivolveIntoBurstMode(s, "handMarcus");

  it.fails("treats the effect of a Marcus it made a Digimon as a Digimon effect, so Aegisdramon's Digimon-effect immunity blocks it (Q5992)", async () => {
    expect(await aegisdramonDpAfterMarcusSuspends(playedFromHand)).toMatchObject({ marcusDp: 0, aegisdramonDp: 12000 });
    expect(await aegisdramonDpAfterMarcusSuspends(playedByBurstMode)).toMatchObject({
      marcusDp: 12000,
      aegisdramonDp: 15000,
    });
  });

  it.fails("deletes the Tamer it treats as a Digimon when another effect drops its DP to 0 (Q5993)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
          ],
          deck: fillerDeck(),
        },
        1: {
          security: [{ card: "BT1-010", as: "topSecurity" }, { card: "EX4-068", as: "heavensJudgement" }, "BT1-010"],
          deck: fillerDeck(),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const marcusInstanceId = s.inst("handMarcus").instanceId;
    preferred.push(marcusInstanceId);
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const treatedMarcus = await digivolveIntoBurstMode(s, "handMarcus");
    expect(treatedMarcus.currentDP).toBe(12000);
    expect(attackPlayer(s, treatedMarcus.permanentId)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("heavensJudgement").instanceId) &&
        !observe(s.engine).isAttacking(),
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusInstanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(marcusInstanceId);
    expect(s.perm("shine").currentDP).toBe(15000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("lets a later Digimon treatment overwrite the 12000 DP while keeping <Rush> and adding <Blocker> (Q5994)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT12-092", as: "handMarcus" },
            { card: "BT17-087", as: "laterMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handMarcus").instanceId);
    s.state.memory = 10;
    await s.ready();

    const treatedMarcus = await digivolveIntoBurstMode(s, "handMarcus");
    expect(treatedMarcus.currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(treatedMarcus, "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("laterMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(treatedMarcus, "Blocker"));
    await settle();

    expect(treatedMarcus.currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(treatedMarcus, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(treatedMarcus, "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(treatedMarcus, "digivolve")).toBe(true);
  });

  it("lets the Marcus it treats as a Digimon gain memory through Zenimon's Tamer-effects-only lock, unlike a plain Digimon effect (Q5995)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "shine" }],
          hand: [
            { card: "BT13-020", as: "burst" },
            { card: "BT13-095", as: "handMarcus" },
            { card: "BT19-029", as: "tapirmon" },
          ],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "ST7-10", as: "dpTarget" },
            { card: "BT18-059", as: "zenimon" },
          ],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("dpTarget").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    const treatedMarcus = await digivolveIntoBurstMode(s, "handMarcus");
    await settle(() => treatedMarcus.isSuspended && s.perm("dpTarget").currentDP === 9000);
    await settle();
    expect(treatedMarcus.currentDP).toBe(12000);
    expect(s.perm("dpTarget").currentDP).toBe(9000);
    expect(s.state.memory).toBe(10 - 5 + 1);

    // Near-miss control: Tapirmon's [On Play] is only a Digimon effect, so Zenimon blocks its memory gain.
    const securityBeforeTapirmon = s.state.players[0]!.security.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapirmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === securityBeforeTapirmon - 1);
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-059")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-059")).toBe(true);
    expect(s.state.memory).toBe(6 - 3);
  });

  it.fails("keeps an opponent Digimon immune to Digimon effects unaffected by the effect of a Marcus it made a Digimon (Q5996)", async () => {
    const whenPlainTamer = await aegisdramonDpAfterMarcusSuspends(playedFromHand);
    expect(whenPlainTamer.aegisdramonDp).toBe(15000 - 3000);

    const whenTreatedAsDigimon = await aegisdramonDpAfterMarcusSuspends(playedByBurstMode);
    expect(whenTreatedAsDigimon.marcusDp).toBe(12000);
    // Marcus's "gain 1 memory" follow-up proves its suspension effect resolved, so the unchanged DP comes from the immunity.
    expect(whenTreatedAsDigimon.memory).toBe(3 - 5 + 1);
    expect(whenTreatedAsDigimon.aegisdramonDp).toBe(15000);
  });
});
