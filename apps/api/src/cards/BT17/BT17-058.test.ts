import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-058.js";
import "./index.js";

describe("BT17-058 GroundLocomon", () => {
  it("reveals three and places one black level-5-or-lower Digimon underneath on both entry timings", () => {
    const effects = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
            to: "placeUnder",
            underFilter: { isSelfRef: true },
          },
        ],
        rest: "trash",
      });
    }
  });

  it("once per turn plays a level-5-or-lower Machine from its digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
              zone: "digivolutionCards",
              hostFilter: { isSelfRef: true },
            },
          },
        },
      ],
    });
  });

  it("places the revealed card only under GroundLocomon and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-058", as: "groundLocomon" }],
          battleArea: [{ card: "BT17-056", as: "otherHost" }],
          deck: [
            { card: "BT17-054", as: "eligible" },
            { card: "BT1-087", as: "remainderOne" },
            { card: "BT1-102", as: "remainderTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    const eligibleId = s.inst("eligible").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundLocomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    const groundLocomon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-058")!;
    expect(groundLocomon.stack.at(0)?.instanceId).toBe(eligibleId);
    expect(s.perm("otherHost").stack).toHaveLength(0);
  });

  it("plays the Machine only from its own evolution stack after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-058", under: [{ card: "BT17-056", as: "ownMachine" }], as: "groundLocomon" },
            { card: "BT17-057", under: [{ card: "BT17-056", as: "otherMachine" }], as: "otherHost" },
          ],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ownMachineId = s.inst("ownMachine").instanceId;
    const otherMachineId = s.inst("otherMachine").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownMachineId),
    );

    expect(s.perm("groundLocomon").topCard?.cardId).toBe("BT17-058");
    expect(s.perm("groundLocomon").stack.some((card) => card.instanceId === ownMachineId)).toBe(false);
    expect(s.perm("otherHost").stack.some((card) => card.instanceId === otherMachineId)).toBe(true);
  });
  it("places the revealed black Digimon at the bottom of the stack when digivolving from a black Lv5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-056", as: "locomon" }],
          hand: [
            { card: "BT17-058", as: "groundLocomon" },
            { card: "BT1-009", as: "spare" },
          ],
          // The first card is consumed by the digivolve bonus draw; the reveal sees the next three.
          deck: [
            { card: "BT1-014", as: "bonusDraw" },
            { card: "BT17-054", as: "eligible" },
            { card: "BT1-012", as: "remainderOne" },
            { card: "BT1-013", as: "remainderTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const locomonId = s.inst("locomon").instanceId;
    const eligibleId = s.inst("eligible").instanceId;
    const groundLocomonId = s.inst("groundLocomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("locomon").permanentId,
        instanceId: groundLocomonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locomon").stack.length === 2);

    // The placed card is the BOTTOM digivolution card, beneath the Lv5 source it digivolved from.
    expect(s.perm("locomon").stack.map((card) => card.instanceId)).toEqual([eligibleId, locomonId]);
    expect(s.perm("locomon").topCard?.instanceId).toBe(groundLocomonId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("remainderOne").instanceId, s.inst("remainderTwo").instanceId]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes all three when none is a black level-5-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-058", as: "groundLocomon" },
            { card: "BT1-009", as: "spare" },
          ],
          // BT1-012/BT1-013 are red (wrong colour); BT17-057 is black but level 6.
          deck: [
            { card: "BT17-057", as: "tooHigh" },
            { card: "BT1-012", as: "offColorOne" },
            { card: "BT1-013", as: "offColorTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundLocomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.perm("groundLocomon").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("tooHigh").instanceId,
        s.inst("offColorOne").instanceId,
        s.inst("offColorTwo").instanceId,
      ]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pierces excess damage into security after deleting a smaller Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-058", as: "groundLocomon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-012", as: "prey", suspended: true }],
          security: [{ card: "BT1-012", as: "securityTop" }, { card: "BT1-013" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const preyId = s.perm("prey").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "permanent", permanentId: preyId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(false);
    // Piercing checked one security card; the 2000 DP Biyomon lost that battle too.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
    expect(s.perm("groundLocomon").topCard?.cardId).toBe("BT17-058");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays only one Machine per turn and rearms on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT17-058",
              as: "groundLocomon",
              under: [
                { card: "BT17-056", as: "machineOne" },
                { card: "BT17-056", as: "machineTwo" },
              ],
            },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [{ card: "BT1-012", as: "drawn" }, { card: "BT1-013" }, { card: "BT1-014" }, { card: "BT1-009" }],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [{ card: "BT1-012" }, { card: "BT1-013" }, { card: "BT1-014" }],
          security: [{ card: "BT1-012" }, { card: "BT1-013" }, { card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("groundLocomon").permanentId;
    const playedFromStack = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-056").length;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => playedFromStack() === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("groundLocomon").stack).toHaveLength(1);

    // Same turn, second real attack: [Once Per Turn] refuses a second play.
    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(playedFromStack()).toBe(1);
    expect(s.perm("groundLocomon").stack).toHaveLength(1);

    // Next own turn through the real turn loop: the counter has reset.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => playedFromStack() === 2);
    expect(s.perm("groundLocomon").stack).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("matches the catalog printed text and evolution cost", () => {
    const definition = getCardDefinition("BT17-058")!;
    expect(definition).toMatchObject({
      nameEn: "GroundLocomon",
      level: 6,
      colors: ["Black"],
      types: ["Machine"],
      playCost: 12,
      dp: 12_000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
    });
    expect(definition.effectText).toContain(
      "[End of Attack] [Once Per Turn] You may play 1 level 5 or lower Digimon card with the [Machine]\u00a0trait from this Digimon's digivolution cards without paying the cost.",
    );
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
