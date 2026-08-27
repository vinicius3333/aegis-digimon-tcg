import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-095.js";
import "../index.js";

describe("BT26-095 compiled fidelity", () => {
  it("registers the placement cost and Digimon-deletion reaction in printed order", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-095")).toMatchObject({
      nameEn: "Makoto Kuonji",
      colors: ["Purple"],
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
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { kind: ["Digimon"] } });
    expect(irNode(watcher)?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "suspend" },
        actions: [
          { kind: "Draw", amount: 1 },
          { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } },
          { kind: "PlaceUnder", faceDown: true },
        ],
      },
    ]);
  });

  it("Q7160 places a BEATBREAK card face down at the bottom, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-095",
              as: "makoto",
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("makoto"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("makoto").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("beatbreakOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("nonBeatbreak").instanceId)).toBe(
      true,
    );
  });

  it("may decline the start-main placement without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("makoto"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("makoto").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("reacts to a Digimon deletion with draw, discard, and face-down BEATBREAK placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          deck: [{ card: "P-236", as: "drawnBeatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("makoto").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawnBeatbreak").instanceId)).toBe(
      false,
    );
    expect(s.perm("makoto").stack[0]).toMatchObject({
      instanceId: s.inst("drawnBeatbreak").instanceId,
      faceUp: false,
    });
  });

  it("also reacts when one of its controller's Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-095", as: "makoto" },
            { card: "BT1-009", as: "victim" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [
            { card: "P-236", as: "beatbreak" },
            { card: "BT1-009", as: "nonBeatbreak" },
            { card: "BT26-003", as: "beatbreakDigiEgg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("makoto").isSuspended).toBe(true);
    expect(s.perm("makoto").stack[0]).toMatchObject({ instanceId: s.inst("beatbreak").instanceId, faceUp: false });
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("nonBeatbreak").instanceId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("beatbreakDigiEgg").instanceId),
    ).toBe(true);
  });

  it("still places an existing BEATBREAK card when there is nothing to draw or trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          trash: [{ card: "P-236", as: "beatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("makoto").isSuspended).toBe(true);
    expect(s.perm("makoto").stack[0]).toMatchObject({ instanceId: s.inst("beatbreak").instanceId, faceUp: false });
  });

  it("does not draw, discard, or place after a deletion when already suspended (Q7164)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto", suspended: true }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [{ card: "ST23-08", as: "beatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("makoto").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "ST23-08")).toBe(true);
  });

  it("may decline the deletion reaction without drawing, discarding, or placing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [{ card: "P-236", as: "beatbreak" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("makoto").isSuspended).toBe(false);
    expect(s.perm("makoto").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("beatbreak").instanceId)).toBe(
      true,
    );
  });

  it("Q7163 reveals a face-down card trashed from under this Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-095",
            as: "makoto",
            under: [{ card: "P-236", as: "hidden", faceUp: false }],
          },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("makoto").permanentId, [s.inst("hidden").instanceId]);

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("hidden").instanceId, faceUp: true }),
    );
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-095", as: "makoto" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const makotoId = s.inst("makoto").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === makotoId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === makotoId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
