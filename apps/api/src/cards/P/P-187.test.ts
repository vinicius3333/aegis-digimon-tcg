import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-187.js";

describe("P-187 Mastemon", () => {
  it("recovers independently of DNA and conditionally places any other Digimon or Tamer for DNA", () => {
    const card = runtimeCompiledCard("P-187")!;
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving" && effect.keywords)).toMatchObject({
      keywords: [{ keyword: "Recovery", amount: 1 }],
    });
    expect(card.effects.find((effect) => effect.actions?.[0]?.kind === "SecurityManipulation")).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "isDnaDigivolving" },
          cost: {
            kind: "place",
            destination: "security",
            position: "choice",
            target: { count: 1, filter: { controller: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] } },
          },
        },
      ],
    });
  });

  it("shares one once-per-turn top-security cost across digivolving and attacking", () => {
    const card = runtimeCompiledCard("P-187")!;
    const effects = card.effects.filter(
      (effect) => effect.trigger === "WhenDigivolving" || effect.trigger === "WhenAttacking",
    );
    expect(effects).toHaveLength(4);
    const plays = effects.filter((effect) => effect.actions?.[0]?.kind === "PlayWithoutCost");
    expect(plays).toHaveLength(2);
    expect(plays.map((effect) => effect.sharedUseKey)).toEqual([
      "trashSecurityPlayDigimon",
      "trashSecurityPlayDigimon",
    ]);
    expect(plays[0]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "trash",
            target: { count: 1, filter: { controller: "mine", zone: "security", position: "top" } },
          },
          target: { count: 1, filter: { colors: ["Yellow", "Purple"], dp: { op: "lte", value: 6000 } } },
        },
      ],
    });
  });

  it("performs Recovery +1 when its digivolution effect resolves", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-187", as: "mastemon" }], security: ["BT1-005"], deck: ["BT1-006"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mastemon"));
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("trashes its top security and plays a qualifying Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-187", as: "mastemon" }],
          security: ["BT1-005", "BT1-006"],
          hand: [{ card: "BT1-045", as: "tsukaimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mastemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-045")).toBe(true);
  });
});
