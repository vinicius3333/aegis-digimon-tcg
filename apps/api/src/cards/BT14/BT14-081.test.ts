import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-081.js";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-081", () => {
  it("plays a Dark Animal or SoC Digimon from trash on digivolution, with two copies if Eiji is underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      target: {
        filter: { levelComparison: { op: "lte", value: 4 } },
        countModifier: { amount: 2, condition: { kind: "selfDigivolutionStackHasTrait" } },
      },
    }));
  it("once per turn unsuspends by deleting an opposing low-level Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", cost: { kind: "deleteOwn" } }],
    }));

  it("naturally digivolves, plays from trash, and unsuspends after deleting a low-level attacker target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "base" }],
          hand: [{ card: "BT14-081", as: "fenriloogamon" }],
          trash: [{ card: "BT14-074", as: "trashLoogarmon" }],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-081");
    expect(s.perm("base").topCard?.cardId).toBe("BT14-081");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("base").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("naturally plays three eligible trash cards when Eiji is in the digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "base", under: ["BT14-087"] }],
          hand: [{ card: "BT14-081", as: "fenriloogamon" }],
          trash: ["BT14-074", "BT14-071", "BT14-072"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT14-081" &&
        s.state.players[0]!.battleArea.filter((perm) =>
          ["BT14-074", "BT14-071", "BT14-072"].includes(perm.topCard?.cardId ?? ""),
        ).length === 3,
    );
    expect(
      s.state.players[0]!.battleArea.filter((perm) =>
        ["BT14-074", "BT14-071", "BT14-072"].includes(perm.topCard?.cardId ?? ""),
      ),
    ).toHaveLength(3);
  });

  it("naturally keeps the main phase open at opponent memory +1, then ends at +3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-081", as: "fenriloogamon" }],
          hand: [
            { card: "BT14-069", as: "firstPlay" },
            { card: "BT14-070", as: "secondPlay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069"));
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await turn;
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0 }));
  });

  it("resets the attack deletion cost and unsuspend on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-081", as: "host", under: ["BT3-085"] }],
          hand: ["BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-009", as: "secondCost" },
          ],
          security: Array(3).fill("BT1-091"),
          hand: ["BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const firstId = s.perm("firstCost").permanentId;
    const secondId = s.perm("secondCost").permanentId;
    const remains = (id: string) => s.state.players[1]!.battleArea.some((p) => p.permanentId === id);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    preferred.push(s.perm("firstCost").topCard.instanceId);
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !s.perm("host").isSuspended);
    expect(remains(firstId)).toBe(false);
    expect(remains(secondId)).toBe(true);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(remains(secondId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferred.splice(0, preferred.length, s.perm("secondCost").topCard.instanceId);
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.perm("host").isSuspended);
    expect(remains(secondId)).toBe(false);
    expect(s.state.players[1]!.trash.filter((c) => c.cardId === "BT1-009")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
