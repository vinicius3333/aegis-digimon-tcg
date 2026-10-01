import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-048.js";

describe("BT8-048 Shurimon", () => {
  it("digivolves from Hawkmon for 2 and prevents an opposing Blocker from attacking or blocking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-009", as: "base" }], hand: [{ card: "BT8-048", as: "evolving" }] },
        1: { battleArea: [{ card: "ST5-08", as: "blocker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("blocker"), "attack") &&
        observe(s.engine).isRestricted(s.perm("blocker"), "block"),
    );
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "block")).toBe(true);
  });

  it("Armor Purges instead of being deleted after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-009", as: "hawkmon" }], hand: [{ card: "BT8-048", as: "shurimon" }] },
        1: { battleArea: [{ card: "BT2-047", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const hawkmonId = s.perm("hawkmon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("shurimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hawkmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.instanceId === hawkmonId);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-048")).toBe(true);
  });
});

describe("BT8-048 Shurimon — KB Q&A rulings", () => {
  it("keeps the targeted Digimon unable to attack or block after it loses <Blocker> by digivolving (Q1733)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-009", as: "hawkmon" }],
          hand: [{ card: "BT8-048", as: "shurimon" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST5-08", as: "blocker" },
            { card: "BT1-015", as: "bystander" },
          ],
          hand: [{ card: "BT2-060", as: "megadramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("shurimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("blocker"), "attack"));

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("blocker").permanentId,
        instanceId: s.inst("megadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").topCard.cardId === "BT2-060");
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "block")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("blocker").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "attack")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bystander").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
  });
});
