import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-080.js";

describe("BT13-080 ProtoGizmon", () => {
  it("reduces its play cost by deleting a level 2 Digimon in the breeding area", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0] as {
      actions?: unknown[];
    };
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["ProtoGizmon"] }] },
    });
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 2,
      cost: {
        kind: "deleteOwn",
        target: { filter: { controller: "mine", kind: ["Digimon"], zone: "breeding", levels: [2] }, count: 1 },
      },
    });
  });

  it("draws then trashes on play and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "permanent",
    });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: AT", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon: AT"] }] }, count: 1 },
      cost: {
        kind: "return",
        target: {
          filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] },
          count: 2,
        },
      },
    });
  });

  it("draws one card and then trashes one card from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-080", as: "proto" }], deck: ["BT1-001"], hand: ["BT1-002"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("proto"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("keeps its permanent no-digivolution restriction active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-080", as: "proto" }] } });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("proto"), "digivolve")).toBe(true);
  });

  it("returns two Gizmon cards before playing Gizmon: AT from the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "proto" }],
          trash: [{ card: "BT13-083", as: "at" }, { card: "BT13-086", as: "xt" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("proto").topCard!.instanceId, s.inst("xt").instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("proto").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-083")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-080", "BT13-086"]),
    );
  });
});
