import { describe, expect, it } from "vitest";
import { getCardDefinition, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-052.js";
import "../BT19/BT19-095.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("EX8-052", () => {
  it("matches the catalog identity and printed routes", () => {
    expect(getCardDefinition("EX8-052")).toMatchObject({
      cardId: "EX8-052",
      nameEn: "Cyberdramon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 9,
      dp: 9000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "X Antibody"],
      effectText: expect.stringContaining("[Cyberdramon]/[X Antibody]"),
      inheritedEffectText: expect.stringContaining("top security card"),
    });
    expect(getCardDefinition("EX8-052")?.securityEffectText).toBeUndefined();
  });
  it("may play a Device Option from hand or trash when Cyberdramon or X Antibody is in its stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlaceInBattleAreaSelf",
      target: {
        filter: { controller: "mine", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }] },
        count: 1,
        from: ["hand", "trash"],
      },
      optional: true,
      condition: {
        kind: "anyOf",
        conditions: [
          {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 1,
            filter: { nameOrTrait: [{ tokens: ["Cyberdramon"], match: "nameExact" }] },
          },
          {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 1,
            filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] },
          },
        ],
      },
    }));
  it("can de-digivolve by 2 by trashing an Option in the battle area", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 2,
      optional: true,
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
          count: 1,
        },
      },
    });
  });
  it("inherits a once-per-turn attack effect that trashes an Option to trash the opponent's top security", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          from: ["security"],
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
              count: 1,
            },
          },
        },
      ],
    }));
  it("trashes the exact opposing security card after paying with an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-001", as: "host", under: ["EX8-052"] },
            { card: "EX8-070", as: "option" },
            { card: "EX8-070", as: "option2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    s.perm("option2").placedByEffect = true;
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("option2").instanceId,
      ),
    ).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option2").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option2").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("uses the Cyberdramon route and places a Device Option from hand in battle", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-062", as: "base" },
            { card: "EX8-070", as: "existingOption" },
          ],
          hand: [
            { card: "EX8-052", as: "xAntibody" },
            { card: "P-155", as: "device" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    s.perm("existingOption").placedByEffect = true;
    preferInstanceIds.push(s.perm("existingOption").permanentId);
    const deviceId = s.inst("device").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === deviceId));
    const device = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === deviceId)!;
    expect(device.placedByEffect).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("uses the [X Antibody] stack branch and places a Device Option from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-062", as: "base", under: ["BT9-109"] }],
          hand: [{ card: "EX8-052", as: "xAntibody" }],
          trash: [{ card: "P-155", as: "device" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["trashing 1 of your Option cards"],
      },
    );
    const deviceId = s.inst("device").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === deviceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === deviceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === deviceId)).toBe(false);
  });

  it("does not place a Device when the digivolution stack has neither required source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-048", as: "base" }],
          hand: [
            { card: "EX8-052", as: "source" },
            { card: "P-155", as: "device" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-052");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("device").instanceId)).toBe(true);
  });

  it("pays with a battle-area Option to de-digivolve an opponent by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-052", as: "source" },
            { card: "EX8-070", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("publicly evolves, places a Device Option by effect, and pays De-Digivolve 2 with that Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-062", as: "base" }],
          hand: [
            { card: "EX8-052", as: "xAntibody" },
            { card: "P-155", as: "device" },
          ],
        },
        1: {
          battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const deviceId = s.inst("device").instanceId;
    const removedStackIds = [s.perm("target").topCard!.instanceId, s.perm("target").stack.at(-1)!.instanceId];
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX8-052" &&
        s.state.players[0]!.trash.some((card) => card.instanceId === deviceId) &&
        s.perm("target").topCard?.cardId === "EX8-024",
    );
    expect(s.perm("base").topCard?.cardId).toBe("EX8-052");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(deviceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === deviceId)).toBe(false);
    expect(s.perm("target").topCard?.cardId).toBe("EX8-024");
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["EX8-020"]);
    expect(removedStackIds).toHaveLength(2);
    expect(
      removedStackIds.every((instanceId) => s.state.players[1]!.trash.some((card) => card.instanceId === instanceId)),
    ).toBe(true);
  });

  it("fires the paid Option's When trashed from the battle area effect (BT19-095)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-052", as: "source", dp: 5000 },
            { card: "BT19-095", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("source").currentDP === 9000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("source").currentDP).toBe(9000);
  });

  it("keeps the Option and opponent stack when the optional de-digivolve is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-052", as: "source" },
            { card: "EX8-070", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("target").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });
});

describe("EX8-052 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("EX8-052")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});

describe("EX8-052 Cyberdramon (X Antibody) — KB Q&A rulings", () => {
  async function digivolveWithTriggerFirst(preferTriggerKeys: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-062", as: "base" },
            { card: "P-155", as: "placedOption" },
          ],
          hand: [
            { card: "EX8-052", as: "xAntibody" },
            { card: "P-155", as: "device" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX8-052" && s.state.pendingDecision === undefined);
    return s;
  }

  it.each([
    ["ir-7-1", "De-Digivolve first", true],
    ["ir-7-0", "Device placement first", false],
  ] as const)(
    "lets the player choose the order of its simultaneous When Digivolving effects: %s = %s (Q3934)",
    async (preferredKey, _label, deDigivolvesFirst) => {
      const s = await digivolveWithTriggerFirst([preferredKey]);
      const deviceId = s.inst("device").instanceId;
      const removedTopId = s.inst("target").instanceId;
      const moveIndex = (instanceId: string) =>
        s.events.findIndex((event) => event.kind === "cardsMoved" && event.instanceIds.includes(instanceId));
      const order = s.decisions.find(({ req }) => req.kind === "orderTriggers");
      expect(order?.req.options?.triggerKeys).toEqual([
        expect.stringContaining("EX8-052/ir-7-0"),
        expect.stringContaining("EX8-052/ir-7-1"),
      ]);

      expect(moveIndex(deviceId)).toBeGreaterThanOrEqual(0);
      expect(moveIndex(removedTopId)).toBeGreaterThanOrEqual(0);
      expect(moveIndex(removedTopId) < moveIndex(deviceId)).toBe(deDigivolvesFirst);
      expect(s.perm("target").topCard?.cardId).toBe("EX8-024");
      expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "P-155")).toHaveLength(
        1,
      );
    },
  );

  it.each([
    ["an Option placed in the battle area by effect", true],
    ["only an Option card in hand", false],
  ] as const)(
    "pays its De-Digivolve cost only with an Option placed in the battle area: %s (Q3935)",
    async (_label, optionOnField) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX8-052", as: "source", under: ["BT1-010"] },
              ...(optionOnField ? [{ card: "ST1-15", as: "fieldOption" }] : []),
            ],
            hand: [{ card: "ST1-16", as: "handOption" }],
          },
          1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const fieldOptionId = optionOnField ? s.inst("fieldOption").instanceId : undefined;
      await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("handOption").instanceId]);
      if (optionOnField) {
        expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(fieldOptionId);
        expect(s.perm("target").topCard?.cardId).toBe("EX8-024");
      } else {
        expect(s.perm("target").topCard?.cardId).toBe("EX8-029");
      }
    },
  );
});
