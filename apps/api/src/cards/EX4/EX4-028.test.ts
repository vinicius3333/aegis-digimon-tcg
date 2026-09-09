import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-028.js";
import "../BT1/BT1-102.js";
import "../BT1/BT1-108.js";
import "../BT8/BT8-097.js";
import "../BT21/BT21-093.js";
import "./EX4-030.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX4-028 Doumon", () => {
  it("matches the catalog and registers complete exclusive IR", () => {
    expect(getCardDefinition("EX4-028")).toMatchObject({
      cardId: "EX4-028",
      nameEn: "Doumon",
      colors: ["Yellow", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
      types: ["Wizard"],
    });
    expect(runtimeCompiledCard("EX4-028")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Kyubimon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Taomon"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Return",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
        to: "hand",
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("is also treated as Taomon by rule", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Taomon"],
    });
  });

  it("returns an opposing Digimon at 6000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
  });
  it("reduces one opposing Digimon by 2000 after a sufficiently costly Option", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000 }],
        },
      ],
    });
  });

  it("requires the exact Kyubimon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Kyubimon"], cost: 3 }]);
  });

  it("returns the exact 6000-DP boundary while a 7000-DP opponent remains", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-028", as: "doumon" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "boundary", dp: 6000 },
            { card: "BT1-021", as: "above", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").topCard.instanceId;
    const aboveId = s.perm("above").permanentId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === boundaryId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === aboveId)).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(boundaryId);
    expect(observe(s.engine).grantedNames(s.perm("doumon"))).toContain("taomon");
  });

  it("returns the exact boundary during a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-034", as: "kyubimon" }],
          hand: [{ card: "EX4-028", as: "doumon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }], deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyubimon").permanentId,
        instanceId: s.inst("doumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-019"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-013");
    expect(s.perm("kyubimon").stack.map((card) => card.cardId)).toEqual(["BT19-034"]);
  });

  it("digivolves from the exact Kyubimon alternate requirement for three memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-034", as: "kyubimon" }],
        hand: [{ card: "EX4-028", as: "doumon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyubimon").permanentId,
        instanceId: s.inst("doumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kyubimon").topCard.cardId === "EX4-028");
    expect(s.perm("kyubimon").topCard.cardId).toBe("EX4-028");
    expect(s.state.memory).toBe(0);
  });

  it("rejects the alternate route from a non-Kyubimon level-4 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-019", as: "illegalBase" }],
        hand: [{ card: "EX4-028", as: "doumon" }],
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
          instanceId: s.inst("doumon").instanceId,
          ...intent,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(10);
    expect(s.perm("illegalBase").topCard.cardId).toBe("BT1-019");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-028");
  });

  it("does not return an opposing Digimon when none is at or below 6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-028", as: "doumon" }],
          battleArea: [{ card: "BT1-019", as: "ownBoundary", dp: 6000 }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-021", as: "above", dp: 7000 }], deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX4-028"));

    expect(s.state.players[0]!.battleArea.map((perm) => perm.permanentId)).toEqual([
      s.perm("ownBoundary").permanentId,
      s.perm("doumon").permanentId,
    ]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([s.perm("above").permanentId]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("requires an Option cost of at least two and activates only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
          ],
          hand: [
            { card: "BT1-108", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option1").instanceId));
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("fires after the Option Main effect resolves (Q3471)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
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
    await settle(
      () => s.perm("target").currentDP === 4000 && s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-013");
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("does not trigger when the Option use cost itself is reduced below two (Q5496)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
            { card: "BT1-009", as: "redSource" },
          ],
          hand: [{ card: "BT8-097", as: "option" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "target", dp: 15000 },
            "BT1-009",
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("triggers when only the payment is reduced and the printed use cost is at least two (Q5497)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
            { card: "BT1-009", as: "redSource" },
          ],
          hand: [{ card: "BT21-093", as: "option" }],
          deck: DECK,
          security: SECURITY,
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
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle();
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT21-093") &&
        s.perm("target").currentDP === 3000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-020"]);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not trigger from an Option resolving as a Security effect (Q5495)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "target", dp: 15000 }],
          deck: DECK,
          security: [{ card: "BT8-097", as: "securityOption" }, ...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "attacker", under: ["EX4-028"] }],
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

    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("triggers for a free public Option use with its printed cost (Q5498)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "host", under: ["EX4-028"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-013", as: "drawnByOption" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 9000 }], deck: DECK, security: SECURITY },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        preferTriggerKeys: ["EX4-028"],
      },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard.cardId === "EX4-030" &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102") &&
        s.perm("target").currentDP === 7000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
  });

  it("resets the inherited once-per-turn watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
            { card: "BT1-045", as: "yellow" },
          ],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }], deck: DECK, security: SECURITY },
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
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
