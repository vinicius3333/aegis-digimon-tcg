import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX3-073.js";
import "../P/P-067.js";

describe("EX3-073 Imperialdramon: Fighter Mode", () => {
  it("matches the official identity, evolution routes, keywords, and complete IR", () => {
    const definition = getCardDefinition("EX3-073")!;
    expect(definition).toMatchObject({
      cardId: "EX3-073",
      nameEn: "Imperialdramon: Fighter Mode",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ancient Dragonkin"],
      rarity: "SEC",
      imageId: "EX3-073",
    });
    expect(definition.effectText).toBe(
      "Digivolve: 2 if name contains [Dragon Mode]＜Piercing＞[When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's digivolution cards to the bottom of its owner's deck, none of your opponent's [Security] effects can activate for the turn.[On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.",
    );
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Dragon Mode"], cost: 2, isAlternate: true }],
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
        {
          trigger: "WhenDigivolving",
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }] },
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  zone: "digivolutionCards",
                  nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
                },
                count: 1,
              },
              to: "deckBottom",
              from: ["digivolutionCards"],
            },
            { kind: "DisableSecurityEffect", sourceKind: "any", duration: "forTheTurn", scope: "seat" },
          ],
        },
        {
          trigger: "OnDeletion",
          optional: true,
          condition: { kind: "anyOf" },
          actions: [
            { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
            { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
          ],
        },
      ],
    });
  });

  it("has Piercing and performs a real piercing security check after winning a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-073", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-028", dp: 3000, suspended: true, as: "defender" }],
        security: ["BT1-009"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("defender").permanentId) &&
        s.state.players[1]!.security.length === 0,
    );

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(true);
    assertNoLoudGap(s);
  });

  it("supports ordinary Lv.5 evolution, the Dragon Mode alternate route, and rejects an invalid source", async () => {
    const ordinary = setupEngine({
      0: {
        battleArea: [{ card: "EX3-062", as: "level5" }],
        hand: [{ card: "EX3-073", as: "fighterMode" }],
      },
    });
    ordinary.state.memory = 5;
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("level5").permanentId,
        instanceId: ordinary.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("level5").topCard.cardId === "EX3-073");
    expect(ordinary.state.memory).toBe(0);
    expect(ordinary.perm("level5").stack.map(({ cardId }) => cardId)).toEqual(["EX3-062"]);

    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "EX3-063", as: "dragonMode" }],
        hand: [{ card: "EX3-073", as: "fighterMode" }],
      },
    });
    alternate.state.memory = 2;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("dragonMode").permanentId,
        instanceId: alternate.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        alternate.perm("dragonMode").topCard.cardId === "EX3-073" &&
        alternate.state.players[0]!.deck.some(({ cardId }) => cardId === "EX3-063"),
    );
    expect(alternate.state.memory).toBe(0);
    expect(alternate.perm("dragonMode").stack).toHaveLength(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "invalidSource" }],
        hand: [{ card: "EX3-073", as: "fighterMode" }],
      },
    });
    invalid.state.memory = 2;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("invalidSource").permanentId,
        instanceId: invalid.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(2);
    expect(invalid.perm("invalidSource").topCard.cardId).toBe("BT1-028");
    expect(invalid.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-073");
    assertNoLoudGap(ordinary);
    assertNoLoudGap(alternate);
    assertNoLoudGap(invalid);
  });

  it("returns an exact Dragon Mode source and suppresses every opposing Security effect for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-062", under: ["EX3-063"], as: "fighterMode" },
            { card: "BT1-028", as: "ally" },
          ],
          hand: [{ card: "EX3-073", as: "fighterModeCard" }],
        },
        1: {
          security: [{ card: "P-067", as: "securityBulucomon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dragonMode = s.perm("fighterMode").stack[0]!;
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const firstTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fighterMode").permanentId,
        instanceId: s.inst("fighterModeCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === dragonMode.instanceId));

    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(dragonMode.instanceId);
    expect(s.perm("fighterMode").stack.map(({ cardId }) => cardId)).toEqual(["EX3-062"]);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("fighterMode"), "P-067")).toBe(true);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("ally"), "P-067")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityBulucomon").instanceId,
    );
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("securityBulucomon").instanceId,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("fighterMode"), "P-067")).toBe(false);
    assertNoLoudGap(s);
  });

  it("requires the exact Dragon Mode name and does not suppress Security for a near-match stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-062", under: ["EX3-073"], as: "fighterMode" },
            { card: "BT1-028", as: "ally" },
          ],
          hand: [{ card: "EX3-073", as: "fighterModeCard" }],
        },
        1: {
          security: [{ card: "P-067", as: "securityBulucomon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("fighterMode").permanentId,
        instanceId: s.inst("fighterModeCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fighterMode").topCard.cardId === "EX3-073");

    expect(s.perm("fighterMode").stack.map(({ cardId }) => cardId)).toEqual(["EX3-073", "EX3-062"]);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("fighterMode"), "P-067")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityBulucomon").instanceId,
    );
    assertNoLoudGap(s);
  });

  it("plays exact Wormmon and Veemon trash cards on public battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-073", suspended: true, as: "fighterMode" }],
          trash: [
            { card: "EX3-055", as: "wormmon" },
            { card: "EX3-004", as: "veemon" },
            { card: "BT1-028", as: "unrelated" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 14000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("fighterMode").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-055") &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-004"),
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("wormmon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("veemon").instanceId);
    assertNoLoudGap(s);
  });

  it("allows On Deletion play refusal and skips the trigger when neither exact name is in trash", async () => {
    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-073", suspended: true, as: "fighterMode" }],
          trash: [
            { card: "EX3-055", as: "wormmon" },
            { card: "EX3-004", as: "veemon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 14000, as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    refused.state.turnSeat = 1;
    await refused.ready();
    expect(
      refused.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: refused.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: refused.perm("fighterMode").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.state.players[0]!.battleArea.length === 0);
    expect(refused.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-073", "EX3-055", "EX3-004"]),
    );
    expect(
      refused.decisions.filter(({ req }) => req.sourceCardId === "EX3-073" && req.kind === "optional"),
    ).toHaveLength(1);

    const noTargets = setupEngine({
      0: {
        battleArea: [{ card: "EX3-073", suspended: true, as: "fighterMode" }],
        trash: [{ card: "BT1-028", as: "unrelated" }],
      },
      1: { battleArea: [{ card: "BT1-028", dp: 14000, as: "attacker" }] },
    });
    noTargets.state.turnSeat = 1;
    await noTargets.ready();
    expect(
      noTargets.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: noTargets.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: noTargets.perm("fighterMode").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => noTargets.state.players[0]!.battleArea.length === 0);
    expect(noTargets.decisions.filter(({ req }) => req.sourceCardId === "EX3-073")).toHaveLength(0);
    expect(noTargets.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-073", "BT1-028"]),
    );
    assertNoLoudGap(refused);
    assertNoLoudGap(noTargets);
  });
});
