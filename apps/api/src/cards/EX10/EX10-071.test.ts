import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-071.js";
import "../index.js";

const CARD_ID = "EX10-071";

describe("EX10-071 Paradise Lost", () => {
  it("records the exact catalog and complete trash/Main contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Paradise Lost",
      colors: ["Purple", "Yellow"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Seven Great Demon Lords"],
    });
    expect(getCardDefinition(CARD_ID)!.securityEffectText).toBe(
      "[Security] You may play 1 Digimon with [Lucemon]\u00a0in its name from your trash without paying the cost.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfYourTurn")).toMatchObject({
      isFromTrash: true,
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
      actions: [
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true, zone: "trash" }, from: ["trash"] },
            to: "deckBottom",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: true,
        },
      ],
    });
    const main = compiled.effects.find(({ trigger }) => trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { bindAs: "lucemonBuffTarget" },
      keyword: { keyword: "Raid" },
    });
    for (const action of main.actions.slice(1)) {
      expect(action).toMatchObject({ target: { fromSelectionRef: "lucemonBuffTarget" } });
    }
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    });
  });

  it("Q5185/Q5187 through the real turn loop: played this turn, then activated from the trash it landed in", async () => {
    let suspendedAtDeclaration: boolean | undefined;
    let attackDeclarations = 0;
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "paradise" }, "BT1-013"],
          battleArea: [{ card: "BT7-111", as: "lucemon" }],
          security: [{ card: "BT1-009", as: "secTop" }, "BT1-010"],
          deck: ["BT1-014", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "attackDeclared") {
            attackDeclarations += 1;
            if (attackDeclarations === 2) suspendedAtDeclaration = s.perm("lucemon").isSuspended;
          }
        },
      },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const p0 = s.state.players[0]!;
    s.state.memory = 5;
    const dpBefore = s.perm("lucemon").currentDP;
    const deckBefore = p0.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ cardId }) => cardId === CARD_ID));
    expect(p0.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.perm("lucemon").currentDP).toBe(dpBefore + 3000);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lucemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 3000);
    expect(s.perm("lucemon").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.events.filter(({ kind }) => kind === "attackDeclared").length === 2);
    await settle(() => false, 60);

    expect(p0.trash.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
    expect(p0.deck).toHaveLength(deckBefore + 1);
    expect(p0.deck.at(-1)!.cardId).toBe(CARD_ID);
    expect(p0.security).toHaveLength(1);
    expect(p0.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.events.filter(({ kind }) => kind === "attackDeclared")).toHaveLength(2);
    expect(suspendedAtDeclaration).toBe(true);
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5186 through the real turn loop: 0 security cards, the attack still happens", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-013"],
          battleArea: [{ card: "BT7-111", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [],
          deck: ["BT1-014", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const p0 = s.state.players[0]!;
    expect(p0.security).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.events.some(({ kind }) => kind === "attackDeclared"));
    await settle(() => false, 60);

    expect(p0.deck.at(-1)!.cardId).toBe(CARD_ID);
    expect(p0.security).toHaveLength(0);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] fires from a REAL security check and plays a Lucemon from the trash for free", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }], security: ["BT1-009"] },
        1: {
          security: [{ card: CARD_ID, as: "paradise" }],
          trash: [
            { card: "BT1-024", as: "decoy" },
            { card: "EX10-060", as: "lucemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const p1 = s.state.players[1]!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length > 0, 3000);
    await settle(() => false, 60);

    expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(true);
    expect(p1.battleArea.map(({ topCard }) => topCard!.cardId)).toEqual(["EX10-060"]);
    expect(p1.security).toHaveLength(0);
    expect(p1.trash.map(({ cardId }) => cardId)).toContain("BT1-024");
    expect(p1.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5185/Q5186 returns itself from trash and still makes a suspended Digimon attack with 0 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon", suspended: true }],
          trash: [{ card: CARD_ID, as: "paradise" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe(CARD_ID);
    expect(s.perm("lucemon").isSuspended).toBe(false);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
  });

  it("trashes top security before the forced attack when security exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-013");
  });

  it("does not return itself or attack without a Lucemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "nonLucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-013", as: "security" }],
          deck: ["BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ownSecurityId = s.inst("security").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([ownSecurityId]);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("supplemental trigger probe: does not return itself or attack without a Lucemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009" }], trash: [{ card: CARD_ID, as: "paradise" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("CR 15-7-4: declining the bottom-deck condition keeps the card in trash and skips the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("waives the Purple/Yellow requirement only while a Lucemon is on the field", async () => {
    const noLucemon = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: ["BT1-024"] } });
    noLucemon.state.memory = 2;
    await noLucemon.ready();
    expect(
      noLucemon.engine.applyIntent(0, { type: "playCard", instanceId: noLucemon.inst("paradise").instanceId }),
    ).toMatchObject({ ok: false, reason: "color-requirement-unmet" });

    const withLucemon = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: [{ card: "BT18-086", as: "larva" }] },
    });
    withLucemon.state.memory = 2;
    await withLucemon.ready();
    expect(
      withLucemon.engine.applyIntent(0, { type: "playCard", instanceId: withLucemon.inst("paradise").instanceId }),
    ).toEqual({ ok: true });
  });

  it("Main offers every Lucemon-named Digimon and no other, then buffs exactly one of them", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "paradise" }],
          battleArea: [
            { card: "EX10-060", as: "satanMode" },
            { card: "EX10-013", as: "rookieLucemon" },
            { card: "BT1-024", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const decoyDp = s.perm("decoy").currentDP;
    const dpBefore = new Map(["satanMode", "rookieLucemon"].map((alias) => [alias, s.perm(alias).currentDP] as const));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      ["satanMode", "rookieLucemon"].some((alias) => s.perm(alias).currentDP === dpBefore.get(alias)! + 3000),
    );

    const offered = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).not.toContain(s.perm("decoy").permanentId);

    const buffed = ["satanMode", "rookieLucemon"].filter(
      (alias) => s.perm(alias).currentDP === dpBefore.get(alias)! + 3000,
    );
    expect(buffed).toHaveLength(1);
    const target = s.perm(buffed[0]!);
    expect(observe(s.engine).hasKeyword(target, "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(target)).toBe(true);
    expect(observe(s.engine).hasKeyword(target, "Blocker")).toBe(true);
    expect(s.perm("decoy").currentDP).toBe(decoyDp);
    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Raid")).toBe(false);
  });

  it("Security offers only Lucemon cards and plays nothing when the trash has none", async () => {
    const mixed = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "paradise" }],
          trash: [
            { card: "BT1-024", as: "decoy" },
            { card: "EX10-060", as: "lucemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await mixed.ready();
    await advance(mixed.engine).fireForInstance(EffectTiming.SecuritySkill, mixed.inst("paradise"));
    await settle(() => mixed.state.players[0]!.battleArea.length > 0);
    expect(mixed.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-060"]);
    expect(mixed.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-024");

    const none = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: ["BT1-024"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await none.ready();
    await advance(none.engine).fireForInstance(EffectTiming.SecuritySkill, none.inst("paradise"));
    await settle(() => false, 60);
    expect(none.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("Security refusal plays nothing even with a Lucemon in the trash", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: [{ card: "EX10-060", as: "lucemon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("paradise"));
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX10-060");
  });

  it("untilOpponentTurnEnd: the four grants live through the opponent's whole turn and lapse at my next Main", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "paradise" }, { card: "EX10-014", as: "weatherdramon" }, "BT1-013"],
          battleArea: [{ card: "BT7-111", as: "lucemon" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "raider" },
            { card: "BT1-013", as: "bystander" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    s.state.memory = 9;
    const baseDp = s.perm("lucemon").currentDP;
    expect(baseDp).toBe(12_000);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lucemon").currentDP === baseDp + 3000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("weatherdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("raider"), "SecurityAttack") === -1);

    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.perm("lucemon").currentDP).toBe(baseDp + 3000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.perm("lucemon").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("raider"), "SecurityAttack")).toBe(-1);

    const securityBefore = p0.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"), 3000);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("lucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.every(({ topCard }) => topCard.cardId !== "BT1-009"), 3000);
    await settle(() => false, 60);

    expect(p1.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-013"]);
    expect(p1.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(p0.security).toHaveLength(securityBefore);
    expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(false);
    expect(p0.battleArea.some(({ topCard }) => topCard.cardId === "BT7-111")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(false);
    expect(s.perm("lucemon").currentDP).toBe(baseDp);
    expect(observe(s.engine).keywordAmount(s.perm("bystander"), "SecurityAttack")).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Main grants Raid, Piercing, Blocker, and +3000 DP to the same Lucemon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: [{ card: "EX10-060", as: "lucemon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    const before = s.perm("lucemon").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lucemon").currentDP === before + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.perm("lucemon").currentDP).toBe(before + 3000);
  });

  it("Security optionally plays a Lucemon from trash without paying", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: [{ card: "EX10-060", as: "lucemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("paradise"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-060")).toBe(true);
  });
});
