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

  it("restricts an opposing permanent through the When Digivolving modal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "weregarurumon" }],
          hand: [{ card: "BT17-027", as: "metal" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 3;
    const opponentId = s.perm("opponent").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("weregarurumon").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("weregarurumon").topCard?.cardId === "BT17-027");

    expect(observe(s.engine).isRestricted(opponentId, "suspend")).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
