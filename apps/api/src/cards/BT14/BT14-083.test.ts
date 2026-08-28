import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-083.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-083", () => {
  it("registers on-play trashing, opponent-host response, and security play", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1 });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      hostFilter: { controller: "opponent", kind: ["Digimon"] },
    });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("naturally gains memory when another Joe trashes an opponent Digimon's source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-083", as: "watcher" }],
          hand: [{ card: "BT14-083", as: "joe" }],
        },
        1: {
          battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-057"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("watcher").isSuspended && s.perm("host").stack.length === 0);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("watcher").isSuspended).toBe(true);
  });
});
