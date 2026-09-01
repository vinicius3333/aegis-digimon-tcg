import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-029.js";
import "../index.js";

describe("BT26-029 compiled fidelity", () => {
  it("encodes Decode/Ascension, security-paid protection, both removal watchers, and the Angel rule trait", () => {
    const card = compiled;
    expect(card.digivolutionRequirement).toEqual([{ namesExact: ["Aegiomon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor("BT26-029")).toEqual(card.digivolutionRequirement);
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(
      card?.effects
        ?.find((effect) => effect.trigger === "Static" && effect.keywords)
        ?.keywords?.map((keyword) => keyword.keyword),
    ).toEqual(expect.arrayContaining(["Decode", "Ascension"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "trashSecurityTop", controller: "mine" },
        optional: true,
        actions: [
          { kind: "SelectBind" },
          { kind: "Restrict", restriction: "dpImmune" },
          { kind: "StackTrashLock" },
          { kind: "Restrict", restriction: "returnToHandOrDeck" },
        ],
      },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldLeavePlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
              },
            },
            fromOwnDigivolutionStack: true,
            payCost: false,
          },
        ],
      },
    ]);
    expect(card?.effects?.[4]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenSecurityRemoved" },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" },
    ]);
    expect(card?.effects?.[5]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
      ],
    });
  });

  it("trashes its top security and protects one chosen Digimon until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy", under: ["BT24-034"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "beReturned")).toBe(true);
  });

  it("may decline the security cost and grants no protection when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "beReturned")).toBe(false);
  });

  it("enforces DP, stack-trash, De-Digivolve, and bounce protection only against opposing effects (Q6995)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-029", as: "holy" },
            {
              card: "BT1-010",
              as: "protected",
              dp: 9000,
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-009", as: "upper" },
              ],
            },
          ],
          security: ["BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT21-009", as: "linkHost", dp: 10000, linked: ["BT26-051"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(s.perm("protected").permanentId, -3000, EffectDuration.UntilEachTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("protected").currentDP).toBe(9000);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("linkHost").permanentId,
    });
    expect(s.perm("protected").topCard.cardId).toBe("BT1-010");
    expect(s.perm("protected").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("upper").instanceId,
    ]);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("protected").permanentId,
      [s.inst("bottom").instanceId],
      1,
    );
    expect(s.perm("protected").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("bottom").instanceId);

    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.returnToHand([s.perm("protected").topCard.instanceId]);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("protected").permanentId,
    );

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("protected").permanentId,
      [s.inst("bottom").instanceId],
      0,
    );
    expect(s.perm("protected").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("bottom").instanceId);
  });

  it("when its security is removed gives exactly 3 opponent Digimon -5000 DP only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy" }],
          security: [
            { card: "BT1-001", as: "firstSecurity" },
            { card: "BT1-002", as: "secondSecurity" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 6000 },
            { card: "BT1-010", as: "second", dp: 6000 },
            { card: "BT1-011", as: "third", dp: 6000 },
            { card: "BT1-012", as: "fourth", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(
      [s.perm("first"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter(
        (permanent) => permanent.currentDP === 1000,
      ),
    ).toHaveLength(3);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(
      [s.perm("first"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter(
        (permanent) => permanent.currentDP === 1000,
      ),
    ).toHaveLength(3);
  });

  it("reacts to a real security check through the non-effect removal window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 6000 },
            { card: "BT1-010", as: "second", dp: 6000 },
            { card: "BT1-011", as: "third", dp: 6000 },
            { card: "BT1-012", as: "fourth", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 0 &&
        [s.perm("attacker"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter(
          (permanent) => permanent.currentDP === 1000,
        ).length === 3,
    );

    expect(
      [s.perm("attacker"), s.perm("second"), s.perm("third"), s.perm("fourth")].filter(
        (permanent) => permanent.currentDP === 1000,
      ),
    ).toHaveLength(3);
  });

  it("inherits a once-per-turn De-Digivolve when its controller's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host", under: ["BT26-029"] }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT26-028", as: "target", under: ["BT26-019"] },
            { card: "BT26-037", as: "second", under: ["BT26-019"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect([s.perm("target"), s.perm("second")].filter(({ topCard }) => topCard.cardId === "BT26-019")).toHaveLength(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect([s.perm("target"), s.perm("second")].filter(({ topCard }) => topCard.cardId === "BT26-019")).toHaveLength(1);
  });

  it("evolves from Aegiomon for 3 and applies the paid protection on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon" }],
          hand: [{ card: "BT26-029", as: "holy" }],
          security: [{ card: "BT1-001", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("aegiomon"), "beReturned"));

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT26-029");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("aegiomon"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("aegiomon"), "beReturned")).toBe(true);
  });

  it("publishes Decode, Ascension, and the rule-granted Angel trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-029", as: "holy" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("holy"), "Decode")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("holy"), "Ascension")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("holy"), "Angel")).toBe(true);
  });

  it("Decode plays Aegiomon from its stack when Holy leaves outside battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy", under: [{ card: "BT24-034", as: "aegiomon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const holyId = s.perm("holy").topCard.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("holy").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === holyId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(holyId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("aegiomon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("aegiomon").instanceId,
    );
  });
});
