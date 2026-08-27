import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-093.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-093 compiled fidelity", () => {
  it("registers the hand placement cost, global attack watcher, grants, and Security play", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-093")).toMatchObject({
      nameEn: "Reina Sakuya",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["Glowing Dawn", "BEATBREAK"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
        actions: [
          { kind: "Draw", amount: 1 },
          { kind: "GainMemory", amount: 1 },
        ],
      },
    ]);
    const watcher = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(irNode(watcher)?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "suspend" },
        actions: [
          { kind: "PlaceUnder", fromDeckTop: true, position: "bottom", faceDown: true },
          { kind: "GainKeyword", keyword: { keyword: "Collision" }, keywords: [{ keyword: "Blocker" }] },
        ],
      },
    ]);
  });

  it("Q7151 places a BEATBREAK card face down at the bottom, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-093",
              as: "reina",
              under: [{ card: "BT1-003", as: "existing", faceUp: false }],
            },
          ],
          hand: [
            { card: "P-236", as: "beatbreakOption" },
            { card: "BT1-009", as: "nonBeatbreak" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("reina").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("beatbreakOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("nonBeatbreak").instanceId }),
    );
  });

  it("may decline the start-main placement without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-093", as: "reina" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("reina").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("pays the attack reaction and grants Collision and Blocker to a BEATBREAK Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-093", as: "reina" },
            { card: "BT26-052", as: "beatbreak" },
            { card: "BT1-009", as: "nonBeatbreak" },
          ],
          deck: [{ card: "BT1-001", as: "placed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("beatbreak").permanentId,
    });

    expect(s.perm("reina").isSuspended).toBe(true);
    expect(s.perm("reina").stack[0]).toMatchObject({ instanceId: s.inst("placed").instanceId, faceUp: false });
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonBeatbreak"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonBeatbreak"), "Blocker")).toBe(false);
  });

  it("grants Blocker in time for a BEATBREAK Digimon to block an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-093", as: "reina" },
            { card: "BT26-052", as: "beatbreak" },
          ],
          security: ["BT1-001"],
          deck: [{ card: "BT1-002", as: "placed" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("beatbreak").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("reina").isSuspended).toBe(true);
  });

  it("still grants both keywords when the deck has no card to place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-093", as: "reina" },
            { card: "BT26-052", as: "beatbreak" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("beatbreak").permanentId,
    });

    expect(s.perm("reina").isSuspended).toBe(true);
    expect(s.perm("reina").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
  });

  it("does not place or grant keywords when the suspend cost can't be paid (Q7155)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-093", as: "reina", suspended: true },
            { card: "BT26-052", as: "beatbreak" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("beatbreak").permanentId });

    expect(s.perm("reina").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(false);
  });

  it("may decline the attack reaction without suspending, placing, or granting keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-093", as: "reina" },
            { card: "BT26-052", as: "beatbreak" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("beatbreak").permanentId,
    });

    expect(s.perm("reina").isSuspended).toBe(false);
    expect(s.perm("reina").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(false);
  });

  it("Q7154 reveals a face-down card trashed from under this Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-093",
            as: "reina",
            under: [{ card: "P-236", as: "hidden", faceUp: false }],
          },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("reina").permanentId, [s.inst("hidden").instanceId]);

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("hidden").instanceId, faceUp: true }),
    );
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-093", as: "reina" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const reinaId = s.inst("reina").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === reinaId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === reinaId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
