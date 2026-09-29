import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-007.js";
import "../BT14/BT14-046.js";
import "../EX9/EX9-043.js";
import "../index.js";

describe("ST12-03 Solarmon", () => {
  it("prevents King Drasil's Royal Knight reduction from activating in breeding (Q754)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", under: ["BT1-001", "BT1-002"] },
          hand: [{ card: "BT13-040", as: "knight" }],
        },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("knight").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT13-007")).toHaveLength(0);
  });

  it("prevents both players from reducing play costs", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-03", "BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(0);
  });

  it("also prevents the opponent from reducing a play cost", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] },
      1: { battleArea: ["ST12-03"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
  });

  it("allows an unblocked green Tamer reduction and pays its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(3);
    expect(s.perm("togemon").isSuspended).toBe(true);
  });

  it("prevents an opponent green Tamer reduction and its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(-10);
    expect(s.perm("togemon").isSuspended).toBe(false);
  });

  it("scopes the lock to play costs and leaves an inherited Togemon evolution reduction active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-045", as: "host", under: ["BT14-046"] },
          { card: "BT1-089", as: "mimi" },
        ],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
      1: { battleArea: ["ST12-03"] },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });

  it("does not block an effect that plays a Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT13-090", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sister").instanceId),
    );
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("sister").instanceId)).toBe(false);
  });

  it("also prevents a green Tamer's play-cost reduction and its suspend cost (Q755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT14-046", as: "togemon" }, { card: "BT1-064", as: "green" }],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    expect(s.state.memory).toBe(0);
    expect(s.perm("togemon").isSuspended).toBe(false);
    expect(s.perm("green").isSuspended).toBe(false);
  });

  it("does not perform an unaffordable blocked Tamer play or pay its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -10;

    const rejected = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId });
    expect(rejected).toEqual({ ok: false, reason: "insufficient-memory" });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    await settle();
    expect(s.state.memory).toBe(-10);
    expect(s.perm("togemon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mimi").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);
  });

  it("blocks a direct BeforePayCost reducer without paying its hand-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03"],
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "BT1-021", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("metal").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-021"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});

describe("ST12-03 Solarmon — KB Q&A rulings", () => {
  function printedPlayCost(cardId: string): number {
    return getCardDefinition(cardId)!.playCost!;
  }

  async function memorySpentPlayingStingmon(withSolarmon: boolean): Promise<number> {
    const s = setupEngine({
      0: {
        battleArea: withSolarmon ? ["ST12-03", "BT1-027"] : ["BT1-027"],
        hand: [{ card: "ST9-09", as: "stingmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("stingmon").instanceId),
    );
    return 10 - s.state.memory;
  }

  async function memorySpentThroughMainPlay(
    sourceCardId: string,
    targetCardId: string,
    withSolarmon: boolean,
    targetZone: "hand" | "trash" = "hand",
  ): Promise<number> {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: sourceCardId, as: "source" }], [targetZone]: [{ card: targetCardId, as: "target" }] },
        1: { battleArea: withSolarmon ? ["ST12-03"] : [] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();
    const [mainEffect] = observe(s.engine).activatableEffects(s.perm("source"));
    expect(mainEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );
    const targetId = s.inst("target").instanceId;
    expect(s.state.players[0]![targetZone].some(({ instanceId }) => instanceId === targetId)).toBe(false);
    return 10 - s.state.memory;
  }

  async function memorySpentOnSanzomonSecurityPlay(withSolarmon: boolean): Promise<number> {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-045", as: "sanzomon" },
            { card: "EX12-039", as: "target" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009"],
        },
        1: { battleArea: withSolarmon ? ["ST12-03"] : [] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanzomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-010");
    return 12 - s.state.memory - printedPlayCost("EX12-045");
  }

  it("negates a 'reduce the play cost' effect so the full play cost is paid (Q752)", async () => {
    const printedCost = printedPlayCost("ST9-09");
    expect(await memorySpentPlayingStingmon(true)).toBe(printedCost);
    expect(await memorySpentPlayingStingmon(false)).toBe(printedCost - 1);
  });

  it("still allows 'play without paying the cost' effects to play a card for free (Q753)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT13-090", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("sister").instanceId),
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("sister").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("lets BaoHuckmon's [Main] play a Sistermon, but at its full play cost (Q4295)", async () => {
    const printedCost = printedPlayCost("BT20-084");
    expect(await memorySpentThroughMainPlay("BT20-013", "BT20-084", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("BT20-013", "BT20-084", false)).toBe(printedCost - 2);
  });

  it("lets BetelGammamon's [Main] play a [VB] card, but at its full play cost (Q6732)", async () => {
    const printedCost = printedPlayCost("EX12-007");
    expect(await memorySpentThroughMainPlay("EX12-013", "EX12-007", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("EX12-013", "EX12-007", false)).toBe(printedCost - 2);
  });

  it("lets TeslaJellymon's [Main] play a [DS] card, but at its full play cost (Q6756)", async () => {
    const printedCost = printedPlayCost("EX12-023");
    expect(await memorySpentThroughMainPlay("EX12-027", "EX12-023", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("EX12-027", "EX12-023", false)).toBe(printedCost - 2);
  });

  it("lets Thundermon's [Main] play an [ME] card, but at its full play cost (Q6802)", async () => {
    const printedCost = printedPlayCost("EX12-038");
    expect(await memorySpentThroughMainPlay("EX12-041", "EX12-038", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("EX12-041", "EX12-038", false)).toBe(printedCost - 2);
  });

  it("lets Hakubamon's [Main] play an [SW] card, but at its full play cost (Q6806)", async () => {
    const printedCost = printedPlayCost("EX12-039");
    expect(await memorySpentThroughMainPlay("EX12-043", "EX12-039", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("EX12-043", "EX12-039", false)).toBe(printedCost - 2);
  });

  it("lets Sanzomon's [Your Turn] security-removal effect play an [SW] card, but at its full play cost (Q6811)", async () => {
    const printedCost = printedPlayCost("EX12-039");
    expect(await memorySpentOnSanzomonSecurityPlay(true)).toBe(printedCost);
    expect(await memorySpentOnSanzomonSecurityPlay(false)).toBe(printedCost - 2);
  });

  it("lets SymbareAngoramon's [Main] play an [NSp] card, but at its full play cost (Q6827)", async () => {
    const printedCost = printedPlayCost("EX12-051");
    expect(await memorySpentThroughMainPlay("EX12-050", "EX12-051", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("EX12-050", "EX12-051", false)).toBe(printedCost - 2);
  });

  it("lets Manekimon's [Main] play a [TB] card, but at its full play cost (Q6967)", async () => {
    const printedCost = printedPlayCost("BT26-008");
    expect(await memorySpentThroughMainPlay("BT26-012", "BT26-008", true)).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("BT26-012", "BT26-008", false)).toBe(printedCost - 2);
  });

  it("lets Gekomon's [Main] play a [TS] Tamer from the trash, but at its full play cost (Q6984)", async () => {
    const printedCost = printedPlayCost("BT24-083");
    expect(await memorySpentThroughMainPlay("BT26-021", "BT24-083", true, "trash")).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("BT26-021", "BT24-083", false, "trash")).toBe(printedCost - 2);
  });

  it("lets Kosuke Misono's [Main] play a [TS] Tamer, but at its full play cost (Q7167)", async () => {
    const printedCost = printedPlayCost("BT24-083");
    expect(await memorySpentThroughMainPlay("BT26-096", "BT24-083", true, "trash")).toBe(printedCost);
    expect(await memorySpentThroughMainPlay("BT26-096", "BT24-083", false, "trash")).toBe(printedCost - 2);
  });
});
