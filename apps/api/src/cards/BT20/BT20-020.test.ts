import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-020.js";
import "./BT20-071.js";
import "./BT20-080.js";
import "./index.js";

describe("BT20-020 Imperialdramon: Fighter Mode", () => {
  it("restricts opponent effect plays, conditionally trashes security, and deletes within source DP", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon", "Tamer"] },
          mode: "play",
          byEffectOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfDigivolutionStackHasTrait" },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Raid" })] }),
        expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Piercing" })] }),
      ]),
    );
  });

  it("evolves from Dragon Mode for 2, trashes top security, and exposes Raid and Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-076", as: "dragonMode" }],
        hand: [{ card: "BT20-020", as: "fighterMode" }],
      },
      1: { security: ["BT20-001", "BT20-001"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("dragonMode").stack.map((card) => card.cardId)).toContain("BT20-076");
    expect(observe(s.engine).hasKeyword(s.perm("dragonMode"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("dragonMode"))).toBe(true);
  });

  it("prevents the opponent from effect-playing Digimon into breeding through their turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-076", as: "dragonMode" }],
          hand: [{ card: "BT20-020", as: "fighterMode" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "soloogarmon" }],
          hand: [{ card: "BT20-080", as: "fenriloogamon" }],
          trash: [{ card: "BT20-070", as: "blockedDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dragonMode").topCard.cardId === "BT20-020");

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("soloogarmon").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("soloogarmon").topCard.cardId === "BT20-080");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("blockedDigimon").instanceId);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("blockedDigimon").instanceId,
      ),
    ).toBe(false);
  });

  it("once per turn deletes an opposing Digimon at the source-DP boundary after opponent security is removed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-020", as: "fighterMode" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 13000, as: "boundary" },
            { card: "BT20-014", dp: 14000, as: "tooLarge" },
            { card: "BT20-014", dp: 7000, as: "secondEligible" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("tooLarge")).toBeDefined();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => false, 50);
    expect(s.perm("secondEligible")).toBeDefined();
  });
  it("naturally deletes an opposing Digimon after a security check within the source DP limit", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-020", as: "fighter" }] },
        1: {
          security: ["BT20-001"],
          battleArea: [
            { card: "BT20-014", dp: 10000, as: "eligible" },
            { card: "BT20-014", dp: 14000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fighter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 10000,
        ),
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 14000,
      ),
    ).toBe(true);
  });
});
