import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-042.js";

describe("EX4-042 DarkMaildramon", () => {
  it("matches the catalog and registers complete residual-free IR", () => {
    expect(getCardDefinition("EX4-042")).toMatchObject({
      cardId: "EX4-042",
      nameEn: "DarkMaildramon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      types: ["Cyborg"],
      effectText:
        "[Your Turn] This Digimon and all Digimon with [Knightmon] or [Knightsmon] in their names are unblockable.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the self and global name-substring targets for the turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      target: { filter: { isSelfRef: true } },
      grant: { keyword: "Unblockable" },
      duration: "forTheTurn",
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GrantStatic",
      target: { count: "all", filter: { nameOrTrait: [{ match: "name", tokens: ["Knightmon", "Knightsmon"] }] } },
      grant: { keyword: "Unblockable" },
      duration: "forTheTurn",
    });
    const secondTarget = (actions?.[1] as { target?: { filter?: unknown } } | undefined)?.target;
    expect(secondTarget?.filter).not.toHaveProperty("controllerDefault");
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-042");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves legally from a black level-3 source and applies to both players' matching names", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-058", as: "base" }],
        hand: [{ card: "EX4-042", as: "subject" }],
      },
      1: {
        battleArea: [
          { card: "EX4-021", as: "opponentKnight" },
          { card: "BT1-009", as: "opponentOther" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("subject").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-042");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-058"]);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentKnight"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentOther"), "cantBeBlocked")).toBe(false);
  });

  it("accepts Knightmon and Knightsmon substrings, ignores other names, and expires after the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-042", as: "subject" },
          { card: "EX4-021", as: "ownKnight" },
          { card: "BT1-009", as: "ownOther" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [
          { card: "EX4-021", as: "opponentKnight" },
          { card: "BT1-009", as: "opponentOther" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("subject"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ownKnight"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentKnight"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ownOther"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentOther"), "cantBeBlocked")).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1);
    expect(observe(s.engine).isRestricted(s.perm("subject"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ownKnight"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentKnight"), "cantBeBlocked")).toBe(false);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  ex4CardBehaviorTests("EX4-042");
});
