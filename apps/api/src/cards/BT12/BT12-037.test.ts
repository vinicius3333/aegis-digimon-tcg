import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-037.js";
import "../ST7/ST7-06.js";

describe("BT12-037 Opossummon", () => {
  it("has the printed Save evolution and DigiXros requirements", () => {
    expect(digivolutionRequirementsFor("BT12-037")).toContainEqual({
      level: 3,
      texts: ["Save"],
      cost: 2,
      isAlternate: true,
    });
  });

  it.each(["BT12-091", "BT12-093", "BT12-097"])("may reveal and free-play named Tamer %s", async (tamer) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-037", as: "opossum" }], deck: [tamer, "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("opossum"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === tamer)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("Saves itself, then places another Save Digimon from trash under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-037", as: "opossum" }, { card: "BT26-087", as: "tamer" }],
          trash: [{ card: "BT12-008", as: "peer" }],
        },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("opossum").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT12-037");
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId, s.inst("peer").instanceId]);
  });

  it("declining optional Save still performs the mandatory Then placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-037", as: "opossum" }, { card: "BT26-087", as: "tamer" }],
          trash: [{ card: "BT12-008", as: "peer" }],
        },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("opossum").instanceId;
    const peerId = s.inst("peer").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-087"]);
  });

  it("inherited attack effect requires Save on the host and resolves once", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-037"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);

    const plain = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-037"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(plain.engine).fire(EffectTiming.OnUseAttack, plain.perm("host"));
    expect(plain.perm("target").currentDP).toBe(plain.perm("target").baseDP);
  });
});
