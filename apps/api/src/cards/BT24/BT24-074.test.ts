import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_074 } from "./BT24-074.js";
import "../index.js";

describe("BT24-074 SkullSeadramon", () => {
  it("trashes digivolution cards before the effect-play deletion branch", () => {
    const onPlay = BT24_074.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3 });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "triggerEnteredByEffect" },
      target: { filter: { digivolutionCards: "none" }, count: 1 },
    });
    const inherited = BT24_074.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
  });

  it("trashes three sources but does not delete after a normal play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001", "BT1-002", "BT1-003"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullseadramon"));

    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("deletes the emptied Digimon when played by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001", "BT1-002", "BT1-003"] }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("skullseadramon"), { enteredByEffect: 0 });

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.trash).toHaveLength(4);
  });

  it("when digivolving only trashes sources even when entered by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-074", as: "skullseadramon" }] },
        1: { battleArea: [{ card: "BT24-072", as: "target", under: ["BT1-001"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("skullseadramon"), {
      enteredByEffect: 0,
    });

    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("plays a level 4 Seadramon from trash on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-074", as: "skullseadramon" }],
          trash: [{ card: "BT15-025", as: "seadramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("skullseadramon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("seadramon").instanceId,
      ),
    );
  });

  it("inherited attack places another Digimon at the bottom to unsuspend its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-075", as: "host", under: ["BT24-074"], suspended: true },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costPermanentId = s.perm("cost").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.at(-1)?.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costPermanentId);
  });
});
