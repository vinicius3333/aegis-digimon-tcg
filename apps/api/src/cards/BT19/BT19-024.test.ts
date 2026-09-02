import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-024 MarineBullmon", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may place an Aquatic hand card as a friendly Digimon's bottom source",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-024", as: "marine" },
              { card: "BT19-023", as: "other" },
            ],
            hand: [
              { card: "BT19-018", as: "aquatic" },
              { card: "BT1-009", as: "nonmatching" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fireForPermanent(timing, s.perm("marine"));
      const sources = [...s.perm("marine").stack, ...s.perm("other").stack].map((card) => card.cardId);
      expect(sources).toEqual(["BT19-018"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    },
  );

  it("Decode plays a blue level 4 source on non-battle leave and completes Q3058's bounce", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-024", as: "host", under: ["BT19-019", "BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT19-028", as: "attacker" },
            { card: "BT19-023", as: "level5" },
            { card: "BT19-028", as: "level6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Decode")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-019"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-024"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT19-023"]);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT19-028")).toBe(true);
  });

  it("Decode plays only from its own digivolution cards, never from a neighbor's stack (CR 16-36-1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-024", as: "marine" },
            { card: "BT19-023", as: "neighbor", under: ["BT19-019"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("marine").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-023"]);
    expect(s.perm("neighbor").stack.map((card) => card.cardId)).toEqual(["BT19-019"]);
  });

  it("Decode does not activate for battle deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-024", as: "marine", under: ["BT19-019"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("marine").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-019", "BT19-024"].sort());
  });

  it("is always Aquatic and its inherited End of Attack plays one eligible source once per turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-028", as: "host", under: ["BT19-019", "BT19-024"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-019"));
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT19-024"]);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-019")).toHaveLength(1);

    const marine = setupEngine({ 0: { battleArea: [{ card: "BT19-024", as: "marine" }] } });
    await marine.ready();
    expect(observe(marine.engine).hasEffectiveTrait(marine.perm("marine"), "Aquatic")).toBe(true);
  });
});
