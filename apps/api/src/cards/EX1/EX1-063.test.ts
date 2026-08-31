import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT18/BT18-077.js";
import "./EX1-063.js";

describe("EX1-063 VenomMyotismon", () => {
  it("has Retaliation and once per turn may play a purple level-4 Retaliation Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "EX1-056", as: "played" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("venom"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-056"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "EX1-056")).toBe(false);
  });

  it("suppresses the played Digimon's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-063", as: "venom" }],
          trash: [{ card: "BT18-077", as: "kaiserLeomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "levelFour" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("kaiserLeomon").instanceId,
      ),
    );

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("levelFour").permanentId),
    ).toBe(true);
  });

  it("does not treat an inherited-only Retaliation clause as a playable Retaliation card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "BT12-076", as: "inheritedOnly" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-076")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-076")).toBe(false);
  });
});
