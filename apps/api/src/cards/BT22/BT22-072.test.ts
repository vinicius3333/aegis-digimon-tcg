import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

type EngineInternals = {
  primitives: {
    deletePermanent(ids: string[], cause: "byEffect" | "byBattle"): Promise<unknown>;
    returnToHand(instanceIds: string[]): Promise<unknown>;
  };
};

function internals(s: ReturnType<typeof setupEngine>): EngineInternals {
  return s.engine as unknown as EngineInternals;
}

const LEKISMON = "BT22-072";
const LUNAMON = "BT22-069";
const SAYO = "BT22-102";

describe("BT22-072 Lekismon", () => {
  it("plays a Night Claw Tamer when its stack has a same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LUNAMON, as: "host", under: [LUNAMON] }],
          hand: [
            { card: LEKISMON, as: "lekismon" },
            { card: SAYO, as: "sayo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("lekismon").instanceId,
        permanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === SAYO));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === SAYO)).toBe(true);
  });

  it("prevents an effect deletion by trashing two same-level cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: LUNAMON, as: "host", under: [LUNAMON, LUNAMON, LEKISMON] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("also prevents battle deletion, but does not prevent a bounce", async () => {
    const battle = setupEngine(
      { 0: { battleArea: [{ card: LUNAMON, as: "host", under: [LUNAMON, LUNAMON, LEKISMON] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const battleHostId = battle.perm("host").permanentId;
    await battle.ready();
    await internals(battle).primitives.deletePermanent([battleHostId], "byBattle");
    await settle();
    expect(battle.state.players[0]!.battleArea.some((p) => p.permanentId === battleHostId)).toBe(true);

    const bounce = setupEngine(
      { 0: { battleArea: [{ card: LUNAMON, as: "host", under: [LUNAMON, LUNAMON, LEKISMON] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const topId = bounce.perm("host").topCard!.instanceId;
    await bounce.ready();
    await internals(bounce).primitives.returnToHand([topId]);
    await settle();
    expect(bounce.state.players[0]!.battleArea).toHaveLength(0);
    expect(bounce.state.players[0]!.hand.some((card) => card.instanceId === topId)).toBe(true);
  });

  it("limits the inherited deletion prevention to once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: LUNAMON,
              as: "host",
              under: [LUNAMON, LUNAMON, LUNAMON, LEKISMON],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });

  it("prevents a public battle deletion by trashing the same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-072",
              as: "host",
              dp: 1000,
              suspended: true,
              under: ["BT22-069", "BT22-069", "BT22-072"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hostId = s.perm("host").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-069").length === 2);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-069")).toHaveLength(2);
  });
});
