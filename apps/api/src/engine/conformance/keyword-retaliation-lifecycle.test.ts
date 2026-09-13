import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("bounded Retaliation lifecycle", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0231",
      "§16-13-1 through §16-13-3: Retaliation is mandatory only when its holder is deleted in battle",
      "9fa675c87ec50b4575c9c464804c403e19fd1247cadf8ed144268d60d23801f7",
    ),
  );
  it("deletes the winning opponent Digimon when native Retaliation loses a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-059", as: "retaliating" }] },
      1: { battleArea: [{ card: "BT1-025", as: "winner", dp: 12000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("retaliating").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("retaliating").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("winner").instanceId);
  });

  it("applies inherited Retaliation from BT19-067 and preserves source identity", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "carrier", under: [{ card: "BT19-067", as: "source" }] }] },
      1: { battleArea: [{ card: "BT1-025", as: "winner", dp: 12000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("carrier").instanceId, s.inst("source").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("winner").instanceId);
  });

  it("does not trigger Retaliation from a plain battle loss", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }] },
      1: { battleArea: [{ card: "BT1-025", as: "winner", dp: 12000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("winner").permanentId,
    );
  });

  it("does not trigger Retaliation when an opponent effect deletes the holder", async () => {
    cite("comprehensive-0231", "Retaliation triggers only when its Digimon is deleted in battle");
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-059", as: "holder" },
            { card: "BT1-014", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "survivor" }], hand: [{ card: "ST1-16", as: "gaia" }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const target = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: target.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("holder").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("holder").instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("holder").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("survivor").permanentId,
    );
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(false);
  });
});
