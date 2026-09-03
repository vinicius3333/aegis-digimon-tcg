import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-003.js";

describe("BT22-003 Tapmon", () => {
  it("reduces one opposing Digimon by 2000 when its inherited host gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", under: ["BT22-003"], as: "host" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);

    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
  });

  it("does not trigger for another stack, on the opponent's turn, or twice in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", under: ["BT22-003"], as: "host" },
            { card: "BT21-009", as: "otherHost" },
          ],
          hand: [
            { card: "BT21-009", as: "otherLink" },
            { card: "BT21-009", as: "firstLink" },
            { card: "BT21-009", as: "secondLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT21-009", as: "opponentHost" },
          ],
          hand: [{ card: "BT21-009", as: "opponentLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("otherLink").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("opponentLink").instanceId,
        targetPermanentId: s.perm("opponentHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentHost").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
  });
});
