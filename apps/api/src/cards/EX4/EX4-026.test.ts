import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-026.js";
import "../BT1/BT1-102.js";
import "../BT16/BT16-100.js";
import "./EX4-030.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX4-026 Youkomon", () => {
  it("matches the catalog and has complete exclusive compiled IR", () => {
    expect(getCardDefinition("EX4-026")).toMatchObject({
      cardId: "EX4-026",
      nameEn: "Youkomon",
      colors: ["Yellow", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      types: ["Mysterious Beast"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Renamon"], cost: 2, isAlternate: true }]);

    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Kyubimon"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -2000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
  });

  it("grants Blocker to exactly one chosen ally on play and treats itself as Kyubimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "preferred" },
            { card: "BT1-013", as: "other" },
            { card: "BT1-045", as: "yellow" },
          ],
          hand: [{ card: "EX4-026", as: "youkomon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("preferred").topCard.instanceId);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("youkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("preferred"), "Blocker"));

    expect(observe(s.engine).hasKeyword(s.perm("preferred"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(observe(s.engine).grantedNames(s.perm("youkomon"))).toContain("kyubimon");
  });

  it("applies the same Blocker choice on public digivolution, pays the alternate cost, and draws", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "BT1-009", as: "preferred" },
          ],
          hand: [{ card: "EX4-026", as: "youkomon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, ...DECK],
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("preferred").topCard.instanceId);
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("renamon").permanentId,
        instanceId: s.inst("youkomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").topCard.cardId === "EX4-026");

    expect(s.state.memory).toBe(0);
    expect(s.perm("renamon").stack.map((card) => card.cardId)).toEqual(["EX2-019"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-013");
    expect(observe(s.engine).hasKeyword(s.perm("preferred"), "Blocker")).toBe(true);
  });

  it("requires exact Renamon for the alternate route and rejects a non-Renamon Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "illegalBase" }],
        hand: [{ card: "EX4-026", as: "youkomon" }],
        deck: DECK,
        security: SECURITY,
      },
      1: { deck: DECK, security: SECURITY },
    });
    s.state.memory = 10;
    await s.ready();

    for (const intent of [{}, { alternateRequirementIndex: 0 }, { useAlternateCost: true }]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("illegalBase").permanentId,
          instanceId: s.inst("youkomon").instanceId,
          ...intent,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(10);
    expect(s.perm("illegalBase").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-026");
  });

  it("expires Blocker after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally" }],
          hand: [{ card: "EX4-026", as: "youkomon" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("youkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires once after a cost-2 Option, not for cost 1 or a second cost-2 use", async () => {
    const s = setupEngine(
      {
        0: {
          // The Option's color requirement is met by the yellow Digimon.
          // (EX4-026 is an inherited source, not the face-up host.)
          // Keep the blue host so this also proves the source's color is not inferred.
          hand: [
            { card: "BT1-108", as: "cheap" },
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
          ],
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cheap").instanceId));
    expect(s.perm("target").currentDP).toBe(6000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    const secondId = s.inst("second").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondId));
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("triggers after the Option Main effect resolves (Q3467)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
            { card: "BT1-045", as: "yellow" },
          ],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: [{ card: "BT1-013", as: "drawnByMain" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }], deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("does not trigger when the Option's own use cost is reduced below two (Q5492)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
            { card: "BT1-009", as: "redSource" },
            { card: "BT1-045", as: "yellow" },
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
          ],
          hand: [{ card: "BT8-097", as: "option" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "target", dp: 15000 },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("triggers when payment is reduced to zero but the printed use cost is at least two (Q5493)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
            { card: "BT1-045", as: "yellow" },
            { card: "BT10-071", as: "purple" },
          ],
          hand: [{ card: "BT16-100", as: "option" }],
          deck: DECK,
          security: ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "deleted", dp: 6000 },
            { card: "BT1-020", as: "target", dp: 5000 },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not trigger for an Option resolved as a Security effect (Q5491)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX4-026"] }],
          deck: DECK,
          security: [{ card: "BT8-097", as: "securityOption" }, ...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "attacker" }],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 6;
    s.state.turnSeat = 1;
    await s.ready();
    const securityOptionId = s.inst("securityOption").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === securityOptionId));

    expect(s.perm("host").currentDP).toBe(1000);
    expect(s.state.memory).toBe(6);
  });

  it("fires for a free public Option use with its printed cost (Q5494)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "taomon", under: ["EX4-026"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-013", as: "drawnByOption" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["EX4-026"] },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("taomon").topCard.cardId === "EX4-030" &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102") &&
        s.perm("target").currentDP === 4000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
  });

  it("resets the inherited watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
            { card: "BT1-045", as: "yellow" },
          ],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 1000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const secondId = s.inst("second").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondId));
    expect(s.perm("host").currentDP).toBe(1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
