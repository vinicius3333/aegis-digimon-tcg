import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-101.js";

describe("BT13-101 Miki Kurosaki & Megumi Shirakawa", () => {
  it("may play a PawnChessmon from hand without paying", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["PawnChessmon"] }] },
        count: 1,
      },
    });
  });

  it("requires a two-color black/yellow Digimon and suspending this Tamer before draw and memory", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as {
      sourceFilter?: unknown;
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], multicolor: true, colors: ["Yellow", "Black"] },
    });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      abortOnDecline: true,
    });
    expect(watcher.actions?.[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "ifThisEffectActed", raw: "you did" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("plays PawnChessmon from hand through its on-play effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-101", as: "tamers" }], hand: [{ card: "BT13-035", as: "pawn" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tamers"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-035"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-035")).toBe(true);
  });
});
