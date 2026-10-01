import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT17/BT17-013.js";
import "../BT17/BT17-016.js";
import "../BT5/BT5-080.js";
import "./ST7-05.js";
import "./ST7-06.js";
import "./ST7-07.js";
import "./ST7-09.js";

describe("ST7-05 Growlmon", () => {
  it("gains 1 memory once per turn when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-05"] }] },
        1: { battleArea: ["ST7-02"], security: ["ST7-01"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
  });

  it("does not gain memory again from a second deletion in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-05"] }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "first" },
          { card: "ST7-02", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.memory).toBe(1);
  });
});

describe("ST7-05 Growlmon — KB Q&A rulings", () => {
  async function battleWithGrowlmonInherited(hostCard: string) {
    const s = setupEngine({
      0: { battleArea: [{ card: hostCard, as: "host", under: ["ST7-05"] }] },
      1: { battleArea: [{ card: "ST7-06", as: "defender", suspended: true }], security: ["ST7-01"] },
    });
    s.state.memory = 2;
    await s.ready();
    const defenderInstanceId = s.perm("defender").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === defenderInstanceId));
    return s;
  }

  it("does not gain memory when its host and the opposing Digimon are deleted in the same battle (Q683)", async () => {
    const mutual = await battleWithGrowlmonInherited("ST7-06");
    expect(mutual.state.players[0]!.battleArea).toHaveLength(0);
    expect(mutual.state.memory).toBe(2);

    const survivor = await battleWithGrowlmonInherited("ST7-07");
    await settle(() => survivor.state.memory === 3);
    expect(survivor.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("resolves the memory gain before Retaliation, so a 0-memory Gallantmon loses its immunity and is deleted (Q2746)", async () => {
    const attackRetaliator = async (sourceUnderGallantmon: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT17-016", as: "gallant", under: [sourceUnderGallantmon] }],
            hand: ["BT1-009"],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
          1: {
            battleArea: [{ card: "BT5-080", as: "zanbamon", suspended: true }],
            security: ["BT1-009"],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("gallant").permanentId,
          target: { kind: "permanent", permanentId: s.perm("zanbamon").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
      return s;
    };

    const withGrowlmon = await attackRetaliator("ST7-05");
    await settle(() => withGrowlmon.state.players[0]!.battleArea.length === 0);
    expect(withGrowlmon.state.memory).toBe(1);
    expect(withGrowlmon.state.players[0]!.trash.some(({ cardId }) => cardId === "BT17-016")).toBe(true);

    const withoutGrowlmon = await attackRetaliator("BT17-013");
    expect(withoutGrowlmon.state.memory).toBe(0);
    expect(withoutGrowlmon.state.players[0]!.battleArea).toHaveLength(1);
    expect(withoutGrowlmon.perm("gallant").topCard.cardId).toBe("BT17-016");
  });
});
