import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-027.js";
import "./index.js";

describe("BT17-027", () => {
  it("reduces its play cost by 3 with a Matt Ishida Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }],
        },
      ],
    });
  });

  it("offers suspension or free WarGreymon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "Restrict", restriction: "suspend" }],
          [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
              allowNoTarget: true,
            },
          ],
        ],
      });
    }
  });

  it("unsuspends once per turn as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", condition: { kind: "selfHasNameContaining" } }],
    });
  });

  it("unsuspends an Omnimon host when it attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-027"] }] },
        // A non-empty security stack prevents the player-directed attack from
        // ending the match before the inherited unsuspend settles.
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("reduces its play cost with Matt and restricts one opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086", as: "matt" }],
          hand: [{ card: "BT17-027", as: "metal" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 8;
    const opponentId = s.perm("opponent").permanentId;
    const metalId = s.inst("metal").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === metalId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === metalId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isRestricted(opponentId, "suspend")).toBe(true);
  });

  it("can free-digivolve an Agumon into WarGreymon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-029", as: "agumon" }],
          hand: [
            { card: "BT17-027", as: "metal" },
            { card: "BT17-015", as: "wargreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("agumon").topCard?.cardId === "BT17-015");

    expect(s.perm("agumon").topCard?.cardId).toBe("BT17-015");
    expect(s.state.memory).toBe(0);
  });

  it("digivolves via the Garurumon route, draws its bonus, and restricts through the When Digivolving modal", async () => {
    // BT1-040 WereGarurumon is a Blue Lv.5 whose name contains "Garurumon", so it is a
    // legal source for the printed [Digivolve]Lv.5 w/[Garurumon] in its name: Cost 3 route.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "weregarurumon" }],
          hand: [{ card: "BT17-027", as: "metal" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 3;
    const opponentId = s.perm("opponent").permanentId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("weregarurumon").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("weregarurumon").topCard?.cardId === "BT17-027");

    expect(s.perm("weregarurumon").stack.some((card) => card.cardId === "BT1-040")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(observe(s.engine).isRestricted(opponentId, "suspend")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses an illegal digivolution source (not Lv.5 and no Garurumon in name)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "monodramon" }],
          hand: [{ card: "BT17-027", as: "metal" }],
        },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(10);
  });

  it("activates the WarGreymon option with no Agumon and resolves to nothing (Q2773)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-027", as: "metal" },
            { card: "BT17-015", as: "wargreymon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 11;
    const metalId = s.inst("metal").instanceId;
    const wargreymonId = s.inst("wargreymon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: metalId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === metalId));

    // Q2773: the option is selectable with no [Agumon]; it ends without anything happening.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === metalId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === wargreymonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-015")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it("unsuspends an Omnimon host at most once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-027"] }] },
        1: { security: ["BT1-011", "BT1-014"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    // Second attack this turn: the Once Per Turn inherited unsuspend is spent, so it stays suspended.
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
