import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-052.js";

describe("EX6-052 Bastemon", () => {
  it("has Scapegoat and plays a purple level 3 Digimon from trash on digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Purple"], levels: [3] } },
    });
  });
  it("inherits once-per-turn purple level 4 or lower revival when an opponent Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: { filter: { colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } },
            },
          ],
        },
      ],
    }));
  it("publicly plays a purple level 3 from trash on digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-052", as: "bastemon" }], trash: [{ card: "EX6-046", as: "revived" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bastemon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revived").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revived").instanceId),
    ).toBe(true);
  });

  it("legally evolves from a purple level 4, pays 3 memory, and keeps the source in its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-049", as: "base" }], hand: [{ card: "EX6-052", as: "bastemon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX6-052");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-049"]);
    expect(s.state.memory).toBe(2);
  });

  it("does not revive twice during one opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-049", as: "host", under: ["EX6-052"] }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          trash: [
            { card: "EX6-047", as: "revivedA" },
            { card: "EX6-047", as: "revivedB" },
          ],
        },
        1: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          hand: [{ card: "BT1-010", as: "inert" }],
          battleArea: [
            { card: "BT1-009", as: "victimA" },
            { card: "BT1-009", as: "victimB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victimA").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedA").instanceId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    await advance(s.engine).verb.deletePermanent([s.perm("victimB").permanentId], "byEffect");
    await Promise.resolve();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revivedB").instanceId)).toBe(true);
  });

  it("resets the inherited revival on the next opponent turn through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-049", as: "host", under: ["EX6-052"] }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          trash: [
            { card: "EX6-047", as: "revivedA" },
            { card: "EX6-047", as: "revivedB" },
          ],
        },
        1: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          battleArea: [
            { card: "BT1-009", as: "victimA" },
            { card: "BT1-009", as: "victimB" },
            { card: "BT1-009", as: "victimC" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    // Start the actual opponent turn, then prove the first deletion spends the inherited
    // once-per-turn budget and a second deletion in the same turn cannot revive again.
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.deletePermanent([s.perm("victimA").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedA").instanceId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    await advance(s.engine).verb.deletePermanent([s.perm("victimB").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revivedB").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // Chain the real turn loop through the owner's turn and back to the next opponent turn.
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    // The first victim was deleted; the remaining fixture is a fresh opposing Digimon for
    // this next opponent turn, while the second revival card proves the ledger re-armed.
    const nextVictim = s.state.players[1]!.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([nextVictim.permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedB").instanceId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("rejects a non-purple level 4 as an illegal evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX6-052", as: "bastemon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bastemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
