import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-041.js";
import "../index.js";

describe("BT16-041", () => {
  it("models Retaliation", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
    expect(digivolutionRequirementsFor("BT16-041")).toEqual([{ names: ["Wormmon"], cost: 2, isAlternate: true }]);
  });

  it("suspends an opposing Digimon on play, digivolution, and as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    });
  });

  it("suspends an opposing Digimon on play and keeps Retaliation active", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-041", as: "stingmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("stingmon"), "Retaliation")).toBe(true);
  });

  it("uses the printed Wormmon evolution route and suspends on digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-040", as: "base" }], hand: [{ card: "BT16-041", as: "stingmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("stingmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-041");

    expect(s.state.memory).toBe(2);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("fires the inherited When Attacking suspension from a legal evolution stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-045", as: "host", under: [{ card: "BT16-041", as: "source" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
