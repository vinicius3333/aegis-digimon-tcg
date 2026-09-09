import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT12/BT12-060.js";
import { compiled } from "./BT17-049.js";
import "./index.js";

describe("BT17-049 Antylamon", () => {
  it("matches the catalog identity and alternate evolution route", () => {
    expect(getCardDefinition("BT17-049")).toMatchObject({
      cardId: "BT17-049",
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Turuiemon", "Wendigomon"], cost: 3, isAlternate: true },
    ]);
  });

  it("has Alliance and plays one level-3 green or yellow Digimon from trash when digivolving", () => {
    expect(compiled.effects.some((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Alliance"))).toBe(
      true,
    );
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Green"], levels: [3] }, count: 1 },
    });
  });

  it("once per turn deletes another suspended Digimon to play a level-3 Beast from trash", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          target: { filter: { controller: "mine", levels: [3], nameOrTrait: [{ tokens: ["Beast"], match: "trait" }] } },
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
  });

  it("uses the named evolution route and plays a level-3 green Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-025", as: "turuiemon" }],
          hand: [{ card: "BT17-049", as: "antylamon" }],
          trash: [{ card: "BT17-043", as: "terriermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const terriermonId = s.inst("terriermon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === terriermonId),
    );

    expect(observe(s.engine).hasKeyword(s.perm("turuiemon"), "Alliance")).toBe(true);
  });

  it("deletes and then replays the same suspended level-3 Beast after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-050", under: ["BT17-049"], as: "host" },
            { card: "BT17-043", suspended: true, as: "costBeast" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      // Both End of Attack effects (this card's inherited one and the host BT17-050's own
      // "place this Digimon under another Digimon") trigger simultaneously, and their
      // controller orders them. Resolve the inherited Antylamon effect first; letting
      // BT17-050 move itself under another Digimon first would legitimately remove the
      // Digimon whose stack carries this effect.
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT17-049"] },
    );
    const beastId = s.perm("costBeast").topCard!.instanceId;
    const costPermanentId = s.perm("costBeast").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === beastId && permanent.permanentId !== costPermanentId,
      ),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === beastId)).toBe(false);
  });
  it("spends exactly 3 memory on the printed [Turuiemon] route and keeps the source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-025", as: "turuiemon" }],
          hand: [
            { card: "BT17-049", as: "antylamon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turuiemonId = s.inst("turuiemon").instanceId;
    const antylamonId = s.inst("antylamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: antylamonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("turuiemon").topCard?.instanceId === antylamonId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("turuiemon").stack.map((card) => card.instanceId)).toEqual([turuiemonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a level-4 source that is neither Turuiemon nor Wendigomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "kokatorimon" }],
        hand: [{ card: "BT17-049", as: "antylamon" }],
      },
    });
    s.state.memory = 8;
    await s.ready();
    const antylamonId = s.inst("antylamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kokatorimon").permanentId,
        instanceId: antylamonId,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kokatorimon").permanentId,
        instanceId: antylamonId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("kokatorimon").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([antylamonId]);
    expect(s.state.memory).toBe(8);
  });

  it("does not activate the replayed Beast's [On Deletion] Save, per Q2802", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", dp: 20000, under: ["BT17-049"], as: "host" },
            { card: "BT1-085", as: "tamer" },
            { card: "BT12-060", suspended: true, as: "chuuchuumon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const chuuId = s.perm("chuuchuumon").topCard!.instanceId;
    const costPermanentId = s.perm("chuuchuumon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === chuuId && permanent.permanentId !== costPermanentId,
      ),
    );

    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT1-085");
    expect(tamer?.stack.map((card) => card.instanceId) ?? []).not.toContain(chuuId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chuuId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the inherited play only once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", dp: 20000, under: ["BT17-049"], as: "host" },
            { card: "BT17-043", suspended: true, as: "firstCost" },
            { card: "BT17-043", suspended: true, as: "secondCost" },
          ],
          trash: [{ card: "BT17-043", as: "trashBeast" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-013", "BT1-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const trashBeastId = s.inst("trashBeast").instanceId;
    const firstCostId = s.perm("firstCost").topCard!.instanceId;
    const secondCostId = s.perm("secondCost").topCard!.instanceId;
    const hostPermanentId = s.perm("host").permanentId;
    const firstCostPermanentId = s.perm("firstCost").permanentId;
    const secondCostPermanentId = s.perm("secondCost").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The turn's own unsuspend step clears the seeded suspension, so re-suspend the two
    // candidate cost Digimon through the production verb before the attack.
    await advance(s.engine).verb.suspend([firstCostPermanentId, secondCostPermanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === trashBeastId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === firstCostId)).toBe(
      false,
    );

    // Second attack in the same turn: the once-per-turn inherited effect is spent, so the
    // other suspended Beast survives and nothing new leaves the trash.
    await advance(s.engine).verb.unsuspend([hostPermanentId]);
    const trashBefore = s.state.players[0]!.trash.map((card) => card.instanceId).sort();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === secondCostId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(trashBefore);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([secondCostPermanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === secondCostId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === secondCostId)).toBe(
      false,
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
