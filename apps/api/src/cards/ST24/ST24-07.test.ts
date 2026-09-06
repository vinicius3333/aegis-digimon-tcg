import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-07 ShineGreymon", () => {
  it("proves dual-card keywords, shared once-per-turn effects, and GeoGrey Sword's two-step Main effect", () => {
    const compiled = registeredCompiledCards.get("ST24-07") ?? getCompiledCard("ST24-07")!;
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(["Raid", "Piercing", "SecurityAttack"]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            payCost: false,
            target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 5 } },
          },
          { kind: "ModifyDP", amount: -9000, duration: "forTheTurn" },
        ],
      });
      expect(effect?.actions[1]).not.toHaveProperty("optional");
    }
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: -6000 },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } },
        },
      ],
    });
  });

  it("applies the mandatory DP reduction after the optional Tamer play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-06", as: "base" }],
          hand: [
            { card: "ST24-07", as: "shineGreymon" },
            { card: "ST24-13", as: "declinedTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shineGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt === undefined) throw new Error("Optional prompt missing");
    {
      expect(
        s.engine.applyIntent(prompt.seat, {
          type: "respondDecision",
          decisionId: prompt.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("opponent").currentDP === 1000);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("declinedTamer").instanceId);
    expect(s.perm("opponent").currentDP).toBe(1000);
  });

  it("uses Raid in a real player attack and resolves Piercing plus Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST24-07", as: "attacker" }] },
        1: {
          battleArea: [{ card: "ST2-10", as: "highest" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.target.kind === "permanent" &&
          event.target.permanentId === highestId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highestId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
