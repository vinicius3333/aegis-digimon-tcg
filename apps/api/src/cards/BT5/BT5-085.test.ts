import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-084.js";
import { compiled } from "./BT5-085.js";
import "./BT5-087.js";
import "../BT1/BT1-080.js";
import "../BT10/BT10-068.js";
import "../BT10/BT10-110.js";
import "../BT10/BT10-112.js";
import "../BT20/BT20-080.js";
import "../BT20/BT20-081.js";
import "../BT20/BT20-085.js";
import "../BT24/BT24-081.js";
import "../EX12/EX12-037.js";

describe("BT5-085 Armageddemon", () => {
  it("deletes a Diaboromon to reduce its play cost by 12 and enters with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "TOKEN-Diaboromon", as: "diaboromon" },
            { card: "BT24-065", as: "xAntibody" },
            { card: "BT5-073", as: "unrelated" },
          ],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
        1: { battleArea: [{ card: "BT5-084", as: "opponentDiaboromon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("armageddemon").instanceId),
    );
    await s.engine.recomputeContinuousEffects();

    const played = s.state.players[0]!.battleArea.find(
      (p) => p.topCard.instanceId === s.inst("armageddemon").instanceId,
    )!;
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === diaboromonId)).toBe(false);
    expect(s.perm("xAntibody").topCard.cardId).toBe("BT24-065");
    expect(s.perm("unrelated").topCard.cardId).toBe("BT5-073");
    expect(s.perm("opponentDiaboromon").topCard.cardId).toBe("BT5-084");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("represents Rush as an intrinsic keyword without a GainKeyword action", () => {
    const rush = compiled.effects.find(
      (effect) => effect.trigger === "Static" && effect.keywords?.some((k) => k.keyword === "Rush"),
    );

    expect(rush).toEqual(
      expect.objectContaining({
        actions: [],
        keywords: [expect.objectContaining({ keyword: "Rush", raw: "＜Rush＞" })],
      }),
    );
  });

  it("may decline deleting a Diaboromon and then pays the full play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-084", as: "diaboromon" }],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armageddemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("diaboromon").permanentId)).toBe(true);
  });

  it("prevents level 7 Digimon from activating When Digivolving effects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-085", as: "armageddemon" },
          { card: "BT5-087", as: "ownLevel7" },
        ],
      },
      1: { battleArea: [{ card: "BT5-087", as: "level7" }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("ownLevel7"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("level7"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("suppresses a restricted level 7 When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-085", as: "armageddemon" },
            { card: "BT10-069", as: "base" },
          ],
          hand: [{ card: "BT5-087", as: "level7" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("level7").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-087");

    expect(s.perm("base").topCard.cardId).toBe("BT5-087");
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});

describe("BT5-085 Armageddemon — KB Q&A rulings", () => {
  const opponentIds = (s: EngineSetup) => s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);

  it("deletes one of your Diaboromon tokens to reduce its play cost by 12 (Q1354)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "TOKEN-Diaboromon", as: "token" }],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const tokenId = s.perm("token").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armageddemon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === tokenId)).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  // Engine gap: a self-targeted ReactivateEffect collected at the [When Attacking] window
  // reads a GameAccess built without the timing gate, so the suppressed body still runs.
  it.fails("stops a level 7 Digimon's [When Digivolving] effect from triggering and from being activated by its own [When Attacking] effect (Q1355)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-085", as: "armageddemon" },
            { card: "BT20-080", under: ["BT20-085"], as: "host" },
          ],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: ["BT10-055", "BT8-017"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");
    await settle();
    expect(opponentIds(s)).toEqual(["BT10-055", "BT8-017"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(opponentIds(s)).toEqual(["BT10-055", "BT8-017"]);
  });

  it("still activates a level 7 Digimon's [When Digivolving] [When Attacking] effect at the [When Attacking] timing (Q5520)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-085", as: "armageddemon" },
            { card: "EX12-037", as: "omnimon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT8-017", as: "victim" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("omnimon"), "cannotActivateWhenDigivolving")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(opponentIds(s)).toEqual([]);
  });

  async function useSeikenMeppaOnJesmonGx(withArmageddemon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-112", as: "jesmon", suspended: true },
            ...(withArmageddemon ? [{ card: "BT5-085", as: "armageddemon" }] : []),
          ],
          hand: [
            { card: "BT10-110", as: "option" },
            { card: "BT10-068", as: "royalKnight" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();
    return {
      unsuspended: !s.perm("jesmon").isSuspended,
      placedRoyalKnight: s.perm("jesmon").stack.some((card) => card.instanceId === s.inst("royalKnight").instanceId),
    };
  }

  it("prevents another effect from activating a restricted Digimon's [When Digivolving] effect (Q5521)", async () => {
    expect(await useSeikenMeppaOnJesmonGx(true)).toEqual({ unsuspended: true, placedRoyalKnight: false });
    expect(await useSeikenMeppaOnJesmonGx(false)).toEqual({ unsuspended: true, placedRoyalKnight: true });
  });

  async function digivolveIntoTitamon(withArmageddemon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            ...(withArmageddemon ? [{ card: "BT5-085", as: "armageddemon" }] : []),
            { card: "BT1-080", as: "host" },
          ],
          hand: [
            { card: "BT24-081", as: "titamon" },
            { card: "BT1-013", as: "discard" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: ["BT1-009", "BT8-017"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT24-081");
    await settle();
    return {
      discardInHand: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("discard").instanceId),
      opponentBoard: opponentIds(s),
    };
  }

  it("does not process the 'by' cost of a restricted [When Digivolving] effect (Q5522)", async () => {
    expect(await digivolveIntoTitamon(true)).toEqual({
      discardInHand: true,
      opponentBoard: ["BT1-009", "BT8-017"],
    });
    expect(await digivolveIntoTitamon(false)).toEqual({ discardInHand: false, opponentBoard: ["BT8-017"] });
  });

  async function digivolveIntoOmnimonAndAttack(withArmageddemon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            ...(withArmageddemon ? [{ card: "BT5-085", as: "armageddemon" }] : []),
            { card: "BT10-055", as: "host" },
          ],
          hand: [{ card: "EX12-037", as: "omnimon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: ["BT1-009", "BT8-017"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX12-037");
    await settle();
    const afterDigivolving = opponentIds(s).length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    return { afterDigivolving, afterAttacking: opponentIds(s).length };
  }

  it("does not count a suppressed [When Digivolving] timing as a use of a [Once Per Turn] effect (Q5523)", async () => {
    expect(await digivolveIntoOmnimonAndAttack(true)).toEqual({ afterDigivolving: 2, afterAttacking: 1 });
    expect(await digivolveIntoOmnimonAndAttack(false)).toEqual({ afterDigivolving: 1, afterAttacking: 1 });
  });
});
