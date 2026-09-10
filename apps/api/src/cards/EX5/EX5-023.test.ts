import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-023.js";
import "../index.js";

describe("EX5-023 WereGarurumon (X Antibody)", () => {
  it("matches the catalog and encodes both mandatory costs and conditional returns", () => {
    expect(getCardDefinition("EX5-023")).toMatchObject({
      cardId: "EX5-023",
      nameEn: "WereGarurumon (X Antibody)",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      types: ["Beastkin", "X Antibody"],
      effectText: expect.stringContaining("By trashing 2 cards in your hand"),
      inheritedEffectText: expect.stringContaining("by trashing 1 card in your hand"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(digivolving?.[0]).toMatchObject({
      kind: "Unsuspend",
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    });
    expect(digivolving?.[0]).not.toHaveProperty("optional");
    expect(digivolving?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon", "X Antibody"] }] } },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { match: "nameExact", tokens: ["WereGarurumon"] },
            { match: "nameExact", tokens: ["X Antibody"] },
          ],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          condition: { kind: "selfHasNameContaining", names: ["Garurumon", "Omnimon"] },
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        },
      ],
    });
  });

  it("answers Q3583: refusing to trash two cards aborts the Then return and leaves the host suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-018", as: "base", under: ["BT1-040"], suspended: true }],
          hand: [
            { card: "EX5-023", as: "evolving" },
            { card: "BT1-009", as: "costCard" },
          ],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023" && s.state.pendingDecision === undefined);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly declines the optional Then return after paying the mandatory cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-018", as: "base", under: ["BT1-040"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves publicly from a blue level-4 stack, trashes two cards, unsuspends, and returns a matching card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-018", as: "base", under: ["BT1-040"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
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
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves publicly from a purple level-4 stack and recognizes exact WereGarurumon under the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base", under: ["BT1-040"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [
            { card: "BT1-036", as: "returnTarget" },
            { card: "BT1-036", as: "otherReturnTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const returnChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("returnTarget").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-040", "BT10-074"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("otherReturnTarget").instanceId);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not return the trash card when the stack has neither exact WereGarurumon nor X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "base", under: ["BT5-029"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
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
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("returnTarget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("unsuspends a matching inherited host by trashing one hand card once per turn through public attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-040", as: "host", under: ["EX5-023"] }],
        hand: [{ card: "BT1-009", as: "costCard" }],
      },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("costCard").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("costCard").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate the inherited cost when the host name does not match", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-023"] }],
        hand: [{ card: "BT1-010", as: "costCard" }],
      },
      1: { security: ["BT1-011"] },
    });
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("costCard").instanceId);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a non-level-4 evolution source without changing memory or stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX5-023", as: "evolving" }],
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
