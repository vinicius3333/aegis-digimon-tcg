import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-025.js";
import "../BT15/BT15-045.js";
import "../index.js";

describe("EX5-025 Dianamon", () => {
  it("matches the catalog and encodes Blocker, both shared Once Per Turn routes, and the All Turns trigger", () => {
    expect(getCardDefinition("EX5-025")).toMatchObject({
      cardId: "EX5-025",
      nameEn: "Dianamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      types: ["Shaman", "Olympos XII", "Night Claw"],
      effectText: expect.stringContaining("For each of this Digimon's digivolution cards"),
    });
    expect(getCardDefinition("EX5-025")?.effectText).toContain(
      "When an opponent's Digimon's digivolution card is trashed",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(digivolving).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          scope: "acrossDigimon",
          scaling: { per: 1, unit: "digivolutionCards", filter: { controllerDefault: "mine" } },
        },
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    });
    expect(attacking).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
  });

  it("publicly digivolves, trashes one opposing source per own source, locks source-less opponents, and shares the use with attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "base", under: ["BT1-009"], suspended: true }],
          hand: [{ card: "EX5-025", as: "dianamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "stackedOpponent", under: ["BT1-011", "BT1-012"] },
            { card: "BT1-009", as: "bareOpponent" },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-025");
    await settle(() => s.perm("stackedOpponent").stack.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-011", "BT1-012"]),
    );
    expect(observe(s.engine).isRestricted(s.perm("stackedOpponent"), "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("bareOpponent"), "beSuspended")).toBe(true);
    // The opposing source trash also reaches Dianamon's public All Turns trigger.
    expect(s.perm("base").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("stackedOpponent").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks a public opponent suspension effect while the no-source restriction is active (Q3585)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "base" }],
          hand: [
            { card: "EX5-025", as: "dianamon" },
            { card: "BT19-046", as: "suspender" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "bareOpponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("bareOpponent"), "beSuspended"));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-046"));
    expect(s.perm("bareOpponent").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the live restriction for a later source-less entrant and releases it after public evolution (Q3586/Q3587)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "base" }],
          hand: [{ card: "EX5-025", as: "dianamon" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "existingBare" }],
          hand: [
            { card: "BT1-013", as: "laterBare" },
            { card: "BT1-015", as: "evolution" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("existingBare"), "beSuspended"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("laterBare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("laterBare").instanceId),
    );
    const later = s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("laterBare").instanceId)!;
    expect(observe(s.engine).isRestricted(later, "beSuspended")).toBe(true);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("existingBare").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("existingBare").topCard?.cardId === "BT1-015");
    expect(observe(s.engine).isRestricted(s.perm("existingBare"), "beSuspended")).toBe(false);

    // Evolution releases only the restriction; it does not itself suspend the new Digimon.
    expect(s.perm("existingBare").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects an illegal level-three evolution source without changing memory or zones", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongLevel" }],
        hand: [{ card: "EX5-025", as: "dianamon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongLevel").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.perm("wrongLevel").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-025"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
