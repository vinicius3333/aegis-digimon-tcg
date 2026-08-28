import { digiXrosRequirementFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-063.js";

describe("BT12-063 Damemon", () => {
  it.each(["BT12-087", "BT12-094", "BT12-096"])("reveals and free-plays named Tamer %s", async (tamer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-063", as: "damemon" }],
          deck: [{ card: tamer, as: "tamer" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("damemon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === tamer));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === tamer)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves for 2 from a level-3 Digimon with Save text and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-008", as: "saveBase" }],
          hand: [{ card: "BT12-063", as: "damemon" }],
          deck: [{ card: "BT12-094", as: "tamer" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("saveBase").permanentId,
        instanceId: s.inst("damemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-094"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-008"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("rejects the alternate evolution from a level-3 card without Save text", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "plainBase" }],
        hand: [{ card: "BT12-063", as: "damemon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainBase").permanentId,
        instanceId: s.inst("damemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("DigiXroses with one Save-text Digimon for a 2-cost reduction", async () => {
    expect(digiXrosRequirementFor("BT12-063")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT12-063", as: "damemon" },
          { card: "BT12-008", as: "material" },
        ],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("damemon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
    ]);
  });

  it("Saves itself, then places another Save Digimon under its Tamer in exact order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-063", as: "damemon" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-008", as: "peer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("damemon").instanceId;
    const peerId = s.inst("peer").instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("damemon").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId, peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([]);
  });

  it("declining optional Save still performs the mandatory Then placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-063", as: "damemon" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-008", as: "peer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("damemon").instanceId;
    const peerId = s.inst("peer").instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("damemon").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
  });

  it("grants inherited Blocker only to a Save-text host on the opponent's turn", async () => {
    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-063"] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).hasKeyword(opponentTurn.perm("host"), "Blocker")).toBe(true);

    const ownTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-063"] }] } });
    await ownTurn.ready();
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("host"), "Blocker")).toBe(false);

    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-063"] }] } });
    plain.state.turnSeat = 1;
    await plain.ready();
    expect(observe(plain.engine).hasKeyword(plain.perm("host"), "Blocker")).toBe(false);
  });
});
