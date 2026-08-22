import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-076.js";

describe("BT11-076 Ignitemon", () => {
  it("digivolves for 0 from a level 2 with the Xros Heart trait", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-005", as: "xrosHeartEgg" },
        hand: [{ card: "BT11-076", as: "ignitemon" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("xrosHeartEgg").permanentId,
      instanceId: s.inst("ignitemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("xrosHeartEgg").topCard.cardId === "BT11-076");

    expect(s.state.memory).toBe(3);
    expect(s.perm("xrosHeartEgg").topCard.cardId).toBe("BT11-076");
  });

  it("deletes another own Digimon and only an unsuspended opponent of no greater level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-076", as: "ignitemon" },
            { card: "BT1-015", as: "sacrifice" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "eligible" },
            { card: "BT1-081", as: "level-six" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const sacrificeId = s.perm("sacrifice").permanentId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ignitemon"));
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-081"]);
  });

  it("does not delete an opponent above the deleted Digimon's level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-076", as: "ignitemon" },
            { card: "BT1-010", as: "levelThree" },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "levelFour" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ignitemon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gains memory only when its host is played by an effect and only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-071", as: "host", under: ["BT11-076"] }] },
    });
    s.state.memory = 0;
    await s.ready();
    const payload = { subjectPermanentId: s.perm("host").permanentId };

    await advance(s.engine).fireSubTrigger("whenPlayed", payload);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });
    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });

    expect(s.state.memory).toBe(1);
  });
});
