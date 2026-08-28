import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-105.js";
import "../BT5/BT5-044.js";
import "../BT9/BT9-103.js";
import "../BT1/BT1-107.js";
import "../BT12/BT12-104.js";
import "../P/P-037.js";
import "../ST22/ST22-08.js";
import "./BT10-039.js";
import { compiled } from "./BT10-041.js";

describe("BT10-041 Sakuyamon: Maid Mode", () => {
  it("encodes free color-waived Option use, trash replacement, and attack evolution", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          expect.objectContaining({
            kind: "UseOptionWithoutCost",
            payCost: false,
            optional: true,
            waiveColorRequirement: true,
            allowMultiColor: true,
          }),
          expect.objectContaining({
            kind: "SecurityManipulation",
            op: "placeAsSecurity",
            source: "lastOptionUsed",
            from: ["trash"],
            toTop: true,
            faceUp: false,
            condition: { kind: "ifThisEffectUsed" },
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "WhenAttacking",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            payCost: true,
            costOverride: 1,
            ignoreRequirements: true,
            optional: true,
          }),
        ],
      }),
    ]);
  });

  it("offers Plug-Ins and yellow cost-5 Options, including multicolor, but rejects near-matches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "BT10-105", as: "blackPlugin" },
            { card: "BT12-104", as: "multicolorYellow" },
            { card: "BT1-107", as: "costNearMiss" },
            { card: "BT1-109", as: "nameNearMiss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([
      s.inst("blackPlugin").instanceId,
      s.inst("multicolorYellow").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("leaves a Memory Boost in the battle area instead of moving it to security (Q1961)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "P-037", as: "boost" },
          ],
          deck: ["BT1-045", "BT1-046", "BT1-047", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: true, autoSelectCards: true },
    );
    const boostId = s.inst("boost").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === boostId));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === boostId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === boostId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("leaves an Option linked by its Main out of security (Q5451)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "ST22-08", as: "plugin" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const pluginId = s.inst("plugin").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("taomon").linked.some((card) => card.instanceId === pluginId));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === pluginId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === pluginId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("places Tactical Retreat above Maid Mode after its Main moves the Digimon (Q1962)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "BT4-105", as: "retreat" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const maidId = s.inst("maid").instanceId;
    const retreatId = s.inst("retreat").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: maidId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === retreatId));
    expect(s.state.players[0]!.security.slice(0, 2).map((card) => card.instanceId)).toEqual([retreatId, maidId]);
    expect(s.state.players[0]!.security.slice(0, 2).every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-039")).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes the used Option when Kongou prevents adding it to security (Q1960)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "BT10-105", as: "plugin" },
          ],
        },
        1: {
          battleArea: ["BT2-056"],
          hand: [{ card: "BT9-103", as: "kongou" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const pluginId = s.inst("plugin").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103"));
    expect(advance(s.engine).ledgers.continuous.cannotAddSecurityFromEffect(0)).toBe(true);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === pluginId));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === pluginId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("uses both catalog evolution recipes and attack-digivolves into Sakuyamon for 1", async () => {
    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "BT5-044", as: "levelSix" }],
        hand: [{ card: "BT10-041", as: "maid" }],
      },
    });
    alternate.state.memory = 2;
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("levelSix").permanentId,
        instanceId: alternate.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("levelSix").topCard.cardId === "BT10-041");
    expect(alternate.state.memory).toBe(0);

    const attacking = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-041", as: "maid" }],
          hand: [{ card: "BT5-044", as: "sakuyamon" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    attacking.state.memory = 1;
    await attacking.ready();
    expect(
      attacking.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacking.perm("maid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => attacking.perm("maid").topCard.cardId === "BT5-044");
    expect(attacking.state.memory).toBe(0);
    expect(attacking.perm("maid").stack.map((card) => card.cardId)).toContain("BT10-041");
    assertNoLoudGap(alternate);
    assertNoLoudGap(attacking);
  });
});
