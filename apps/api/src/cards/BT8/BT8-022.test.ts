import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-022.js";
import "../BT10/BT10-084.js";

describe("BT8-022 SnowAgumon", () => {
  it("trashes the top digivolution card of an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT8-022", as: "source" }] },
        1: { battleArea: [{ card: "BT8-030", as: "target", under: ["BT8-021", { card: "BT8-023", as: "stackTop" }] }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(opponent.trash.some((c) => c.instanceId === s.inst("stackTop").instanceId)).toBe(true);
  });

  it("can choose a source-free Digimon before Tactimon redirects the trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT8-022", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT8-034", as: "sourceFree" },
            {
              card: "BT10-084",
              as: "tactimon",
              under: [
                { card: "BT10-071", as: "tactimonTopSource" },
                { card: "BT10-073", as: "tactimonBottomSource" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sourceFree").permanentId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tactimon").stack.length === 1);

    expect(s.perm("sourceFree").stack).toHaveLength(0);
    expect(s.perm("tactimon").stack).toHaveLength(1);
    expect(
      s.state.players[1]!.trash.some(
        (card) =>
          card.instanceId === s.inst("tactimonTopSource").instanceId ||
          card.instanceId === s.inst("tactimonBottomSource").instanceId,
      ),
    ).toBe(true);
  });
});
