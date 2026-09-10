import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-032.js";
import "../index.js";

describe("EX5-032 LoaderLeomon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-032")).toMatchObject({
      cardId: "EX5-032",
      nameEn: "LoaderLeomon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Machine"],
      effectText: expect.stringContaining("gets -3000 DP"),
      inheritedEffectText: expect.stringContaining("gains ＜Blocker＞"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Leomon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
          while: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("reduces one opposing Digimon on play until the end of that opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-032", as: "loaderLeomon" }],
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "target", dp: 5000 },
            { card: "BT1-019", as: "untargeted", dp: 4000 },
          ],
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loaderLeomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.perm("untargeted").currentDP).toBe(4000);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(2000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the public alternate Leomon evolution route and reduces one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "base" }],
          hand: [{ card: "EX5-032", as: "loaderLeomon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "target", dp: 5000 },
            { card: "BT1-019", as: "untargeted", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loaderLeomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-032");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-030"]);
    expect(s.state.memory).toBe(4);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.perm("untargeted").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited Blocker only to a Leomon-name host on the opponent's turn", async () => {
    const matching = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-032"] }],
          security: ["BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    matching.state.turnSeat = 1;
    await matching.ready();
    matching.state.memory = 10;
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Blocker")).toBe(true);
    expect(
      matching.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: matching.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      matching.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: matching.perm("host").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(matching.engine).isAttacking());
    expect(matching.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(matching.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      matching.state.players[0]!.battleArea.some((perm) => perm.permanentId === matching.perm("host").permanentId),
    ).toBe(true);
    expect(matching.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(matching.state.pendingDecision).toBeUndefined();

    const nonMatching = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-032"] }],
          security: ["BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("host"), "Blocker")).toBe(false);
    nonMatching.state.memory = 10;
    expect(
      nonMatching.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(nonMatching.engine).isAttacking());
    expect(nonMatching.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
  });

  it("replays itself through public battle deletion only when it has digivolution cards", async () => {
    const withSource = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-032", as: "loader", under: ["EX5-030"] }] },
        1: { battleArea: [{ card: "BT1-021", as: "opponent", dp: 7000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withSource.state.turnSeat = 0;
    await withSource.ready();
    const loaderInstanceId = withSource.inst("loader").instanceId;
    expect(
      withSource.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withSource.perm("loader").permanentId,
        target: { kind: "permanent", permanentId: withSource.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      withSource.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === loaderInstanceId),
    );
    expect(withSource.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === loaderInstanceId)).toBe(
      true,
    );
    expect(withSource.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX5-030"]);
    expect(withSource.state.players[1]!.battleArea).toHaveLength(0);

    const withoutSource = setupEngine({
      0: { battleArea: [{ card: "EX5-032", as: "loader" }] },
      1: { battleArea: [{ card: "BT1-021", as: "opponent", dp: 7000, suspended: true }] },
    });
    withoutSource.state.turnSeat = 0;
    await withoutSource.ready();
    expect(
      withoutSource.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withoutSource.perm("loader").permanentId,
        target: { kind: "permanent", permanentId: withoutSource.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutSource.state.players[0]!.battleArea.length === 0);
    expect(withoutSource.state.players[0]!.battleArea).toHaveLength(0);
    expect(withoutSource.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX5-032"]);
  });

  it("rejects the alternate route from a non-Leomon level-four source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrongSource" }], hand: [{ card: "EX5-032", as: "loaderLeomon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("loaderLeomon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-032"]);
  });
});
