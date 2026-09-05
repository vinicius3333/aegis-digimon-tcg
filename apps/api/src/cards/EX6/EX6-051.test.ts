import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-051.js";

describe("EX6-051 NeoDevimon", () => {
  it("deletes a level 4 or lower opposing Digimon at five or fewer hand cards and trashes an opponent hand card at seven or more", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 5 } },
      {
        kind: "Trash",
        target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
        condition: { kind: "zoneCount", op: "gte", value: 7 },
      },
    ]));
  it("revives DanDevimon from trash at ten opposing trash cards and inherits the opponent-hand fallback", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", controller: "opponent", target: { filter: { controller: "opponent", zone: "hand" } } },
        { kind: "PlayWithoutCost", from: ["trash"], condition: { kind: "ifThisEffectDidNotAct" } },
      ],
    });
  });
  it("publicly deletes an opposing level 4 Digimon on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-051", as: "neo" }] }, 1: { battleArea: [{ card: "BT1-053", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("neo"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("publicly uses the seven-card branch without deleting the opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-051", as: "neo" }] },
        1: {
          hand: Array.from({ length: 7 }, () => "BT1-010"),
          battleArea: [{ card: "BT1-053", as: "victim" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("neo"));
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
