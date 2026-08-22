import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-044.js";
import "../index.js";

describe("BT24-044 Muchomon", () => {
  it("suspends either side, searches two distinct printed categories only after suspending your Digimon", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const [suspend, reveal] = compiled.effects[0]!.actions;
    expect(compiled.effects[0]!.trigger).toBe("OnPlay");
    expect(suspend).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { filter: { controllerDefault: "any", levelComparison: { op: "lte", value: 6 } } },
    });
    expect(reveal).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      condition: { kind: "lastSuspendedIsMine" },
      rest: "deckBottom",
    });
    expect((reveal as any).add).toHaveLength(2);
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn" });
  });

  it("reveals Shoto and an Avian after suspending its own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-044", as: "source" }],
          deck: ["P-133", { card: "BT1-022", as: "birdkin" }, { card: "BT1-009", as: "rest" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "P-133"));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["P-133", "BT1-022"]));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("does not reveal when it suspends an opponent Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-044", as: "source" }], deck: ["P-133", "ST1-02", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("inherited effect gains memory when its host deletes an opponent in battle and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-044"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 3;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("Q5633: inherited effect does not activate when its host is also deleted in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-044"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
    });
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
    );

    expect(s.state.memory).toBe(3);
  });
});
