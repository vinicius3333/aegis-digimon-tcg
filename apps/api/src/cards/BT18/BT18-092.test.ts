import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-092.js";
import "../index.js";

describe("BT18-092 Zenith", () => {
  it("covers Vemmon discard draw, attack cost, dedigivolve, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "Draw", amount: 1, cost: { kind: "trash" } },
        { kind: "GainMemory", amount: 1 },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              cost: { kind: "suspend" },
              additionalCosts: [
                {
                  kind: "return",
                  to: "deckBottom",
                  target: {
                    count: 2,
                    filter: {
                      zone: "digivolutionCards",
                      sameHost: true,
                      hostFilter: { sourceRef: "triggerSubject" },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });

  it("trashes a Vemmon to draw and gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-092", as: "zenith" }],
          hand: [{ card: "BT11-061", as: "vemmon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("zenith"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("vemmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself, returns two Vemmon from the attacking stack, and De-Digivolves an opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-092", as: "zenith" },
            { card: "BT1-010", as: "attacker", under: ["BT11-061", "BT11-061"] },
            { card: "BT1-010", as: "unrelated", under: ["BT11-061", "BT11-061"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-009"] }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zenith").isSuspended && s.perm("target").topCard?.cardId === "BT1-009");

    expect(s.perm("zenith").isSuspended).toBe(true);
    expect(s.perm("attacker").stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(0);
    expect(s.perm("unrelated").stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(2);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
  });

  it("plays itself without cost from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-092", as: "zenith", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("zenith"));

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("zenith").instanceId),
    ).toBe(true);
  });

  it("does not pay from an unrelated stack when the attacking Digimon has no Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-092", as: "zenith" },
            { card: "BT1-010", as: "attacker" },
            { card: "BT1-010", as: "unrelated", under: ["BT11-061", "BT11-061"] },
          ],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.perm("zenith").isSuspended).toBe(false);
    expect(s.perm("unrelated").stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(2);
  });

  it("stays unsuspended and De-Digivolves nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-092", as: "zenith" },
            { card: "BT1-010", as: "attacker", under: ["BT11-061", "BT11-061"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT11-061"] }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("zenith").isSuspended).toBe(false);
    expect(s.perm("attacker").stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(2);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
