import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT1/BT1-101.js";
import "../BT2/BT2-018.js";
import "../BT3/BT3-011.js";
import "../BT20/BT20-025.js";
import "./BT5-032.js";

describe("BT5-032 Hexeblaumon", () => {
  it("trashes 2 bottom sources and gains Jamming when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-032", as: "hexe" }] },
        1: {
          battleArea: [
            {
              card: "BT4-073",
              as: "target",
              under: [
                { card: "BT1-009", as: "bottom" },
                { card: "BT1-010", as: "top" },
              ],
            },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hexe").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0 && observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(true);
  });

  it("prevents opposing Digimon without sources from attacking or blocking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-032", as: "hexe" }] },
      1: { battleArea: [{ card: "BT4-076", as: "opponent" }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);

    await (s.engine as any).primitives.deletePermanent([s.perm("hexe").permanentId], "byEffect");
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(false);
  });

  it("does not gain Jamming when a source remains after trashing two", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-032", as: "hexe" }] },
        1: {
          battleArea: [{ card: "BT4-073", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hexe").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(false);
  });

  it("allows choosing only one of two bottom sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-032", as: "hexe" }] },
        1: {
          battleArea: [{ card: "BT4-073", as: "target", under: ["BT1-009", "BT1-010"] }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hexe").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(false);
  });
});

describe("BT5-032 Hexeblaumon — KB Q&A rulings", () => {
  const OMNIMON_SECURITY_DIGIMON = "BT5-086";

  function isInPlay(s: ReturnType<typeof setupEngine>, seat: 0 | 1, alias: string) {
    return s.state.players[seat]!.battleArea.some((permanent) => permanent.permanentId === s.perm(alias).permanentId);
  }

  async function attackPlayer(s: ReturnType<typeof setupEngine>, attackerAlias: string) {
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attackerAlias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(), 1000);
  }

  it("gains Jamming on the same attack when its own trash leaves an opponent's Digimon with no sources (Q1310)", async () => {
    function board(targetSources: string[]) {
      return setupEngine(
        {
          0: { battleArea: [{ card: "BT5-032", as: "hexe" }] },
          1: {
            battleArea: [{ card: "BT5-023", as: "target", under: targetSources }],
            security: [OMNIMON_SECURITY_DIGIMON],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
    }

    const s = board(["BT1-009", "BT1-010"]);
    await attackPlayer(s, "hexe");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(true);
    expect(isInPlay(s, 0, "hexe")).toBe(true);

    const control = board(["BT1-009", "BT1-010", "BT1-011"]);
    await attackPlayer(control, "hexe");
    expect(control.perm("target").stack).toHaveLength(1);
    expect(isInPlay(control, 0, "hexe")).toBe(false);
  });

  it("does not end the opponent's declared attack when a security effect strips the attacker's sources (Q1311)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-018", as: "attacker", under: ["BT1-009"] }] },
        1: {
          battleArea: [{ card: "BT5-032", as: "hexe" }],
          security: [
            { card: "BT1-101", as: "howlingCrusher" },
            { card: "BT1-010", as: "secondCheck" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );

    await attackPlayer(s, "attacker");

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attack")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondCheck").instanceId);
    expect(isInPlay(s, 0, "attacker")).toBe(true);
  });

  it("does not gain Jamming for later checks when a sourceless Digimon enters after [When Attacking] resolved (Q1312)", async () => {
    function board(opponentBattleArea: PermanentSpec[]) {
      const snapshot = { greymonInPlay: false, hexeHasJamming: false };
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT5-032", as: "hexe", under: ["BT20-025"] }] },
          1: {
            battleArea: opponentBattleArea,
            security: [{ card: "BT3-011", as: "greymon" }, OMNIMON_SECURITY_DIGIMON],
          },
        },
        {
          autoSelectCards: true,
          autoAcceptOptional: true,
          onEvent(event: ServerEvent) {
            if (event.kind === "securityRevealed" && event.revealedCardId === OMNIMON_SECURITY_DIGIMON) {
              snapshot.greymonInPlay = s.state.players[1]!.battleArea.some(
                (permanent) =>
                  permanent.topCard.instanceId === s.inst("greymon").instanceId && permanent.stack.length === 0,
              );
              snapshot.hexeHasJamming = observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming");
            }
          },
        },
      );
      return { s, snapshot };
    }

    const { s, snapshot } = board([]);
    await attackPlayer(s, "hexe");
    expect(snapshot).toEqual({ greymonInPlay: true, hexeHasJamming: false });
    expect(isInPlay(s, 0, "hexe")).toBe(false);

    const { s: control } = board([{ card: "BT4-076", as: "sourceless" }]);
    await attackPlayer(control, "hexe");
    expect(observe(control.engine).hasKeyword(control.perm("hexe"), "Jamming")).toBe(true);
    expect(isInPlay(control, 0, "hexe")).toBe(true);
  });
});
