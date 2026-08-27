import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-060.js";

describe("BT8-060 Ryudamon", () => {
  it("adds an X-Antibody card and Yuji Musya from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-060", as: "source" }],
          deck: [{ card: "BT8-063", as: "xAntibody" }, { card: "BT8-092", as: "yuji" }, "BT8-061"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("xAntibody").instanceId, s.inst("yuji").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });

  it("grants Decoy only to a host with the X-Antibody trait", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT8-063", as: "host", under: ["BT8-060"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).hasKeyword(matching.perm("host"), "Decoy")).toBe(true);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT8-060"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).hasKeyword(other.perm("host"), "Decoy")).toBe(false);
  });

  it("uses inherited Decoy to protect another black Digimon from an opponent's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-063", as: "decoy", under: ["BT8-060"] },
            { card: "BT8-059", as: "protected" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const protectedId = s.perm("protected").permanentId;
    const decoyId = s.perm("decoy").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([protectedId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === decoyId)).toBe(false);
  });
});
