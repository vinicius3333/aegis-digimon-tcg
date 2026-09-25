import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-048.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX4-048 Gaiomon", () => {
  it("matches the catalog and is registered as complete compiled IR", () => {
    expect(getCardDefinition("EX4-048")).toMatchObject({
      cardId: "EX4-048",
      nameEn: "Gaiomon",
      colors: ["Black", "Red"],
      level: 6,
      playCost: 12,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });
    expect(runtimeCompiledCard("EX4-048")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("is also treated as Greymon and deletes an opposing Digimon costing at least thirteen", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Greymon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { playCostGte: 13 } },
    });
  });
  it("trashes security when no Digimon was deleted and can free-digivolve with a Tamer", () => {
    const effects = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(effects?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      ignoreRequirements: true,
      condition: { kind: "youHave" },
      into: { playCostGte: 13 },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-048");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("treats Gaiomon as Greymon by rule and deletes an opposing high-cost Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX4-048", as: "gaiomon" }] },
      1: { battleArea: [{ card: "AD1-025", as: "high" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).effectiveNames(s.perm("base"))).toContain("greymon");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("AD1-025");
  });

  it("trashes the opponent's top security card when no opposing Digimon costs thirteen", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX4-048", as: "gaiomon" }] },
      1: { battleArea: [{ card: "BT1-020", as: "low" }], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("does not delete a cost-twelve Digimon, but deletes exactly cost thirteen", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX4-048", as: "gaiomon" }] },
      1: {
        battleArea: [
          { card: "AD1-004", as: "twelve" },
          { card: "BT1-083", as: "thirteen" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-083"));
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("AD1-004");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("AD1-004");
  });

  it("does not alternate-digivolve into a non-Gaiomon even when its play cost is high", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-048", as: "source" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "AD1-025", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.EndOfYourTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard?.cardId).toBe("EX4-048");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("AD1-025");
  });

  it("free-digivolves a high-cost Gaiomon-name card at the public end of turn only with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-048", as: "source" }],
          hand: [
            { card: "BT1-089", as: "tamer" },
            { card: "BT9-068", as: "nextGaiomon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await openMain(s, 0);
      s.state.memory = 4;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-089"));
      expect(s.state.memory).toBe(0);
      const paidDigivolutionEventsBefore = s.events.filter(
        (event) => event.kind === "memoryChanged" && event.reason === "digivolve",
      ).length;
      closeMain(s, 0);
      await settle(() => s.perm("source").topCard?.cardId === "BT9-068");
      expect(s.perm("source").topCard?.cardId).toBe("BT9-068");
      expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX4-048"]);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nextGaiomon").instanceId)).toBe(false);
      expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "digivolve")).toHaveLength(
        paidDigivolutionEventsBefore,
      );
      await openMain(s, 1);
    } finally {
      await stopLoop(s, loop, 1);
    }

    const withoutTamer = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-048", as: "source" }],
          hand: [{ card: "BT9-068", as: "nextGaiomon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutTamer.ready();
    const withoutTamerLoop = withoutTamer.engine.startTurnLoop();
    try {
      await openMain(withoutTamer, 0);
      withoutTamer.state.memory = 1;
      const paidDigivolutionEventsBefore = withoutTamer.events.filter(
        (event) => event.kind === "memoryChanged" && event.reason === "digivolve",
      ).length;
      closeMain(withoutTamer, 0);
      await openMain(withoutTamer, 1);
      expect(withoutTamer.perm("source").topCard?.cardId).toBe("EX4-048");
      expect(withoutTamer.perm("source").stack).toHaveLength(0);
      expect(
        withoutTamer.state.players[0]!.hand.some(
          (card) => card.instanceId === withoutTamer.inst("nextGaiomon").instanceId,
        ),
      ).toBe(true);
      expect(
        withoutTamer.events.filter((event) => event.kind === "memoryChanged" && event.reason === "digivolve"),
      ).toHaveLength(paidDigivolutionEventsBefore);
    } finally {
      await stopLoop(withoutTamer, withoutTamerLoop, 1);
    }
  });
  ex4CardBehaviorTests("EX4-048");
});
