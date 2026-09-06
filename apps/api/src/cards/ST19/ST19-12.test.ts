import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-12.js";

describe("ST19-12 Familiar Token", () => {
  it("creates the printed Yellow 3000 DP token and resolves its On Deletion effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST19-10", as: "host" }], hand: [{ card: "ST19-12", as: "cendrill" }] },
        1: { battleArea: [{ card: "AD1-001", dp: 7000, as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tokenDefinition = getCardDefinition("TOKEN-Familiar-Token");
    expect(tokenDefinition).toMatchObject({ dp: 3000, colors: ["Yellow"], isToken: true });

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("cendrill").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Familiar-Token").length === 2,
    );
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Familiar-Token");
    expect(token).toBeDefined();

    // The token has summoning sickness; directly delete it to observe its
    // printed On Deletion effect rather than accidentally testing attack legality.
    await advance(s.engine).verb.deletePermanent([token!.permanentId]);
    await settle(() => (s.perm("opponent").currentDP ?? 7000) === 4000);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("uses Overclock by deleting a Token, then attacks without suspending", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["AD1-001"],
          deck: ["AD1-001", "AD1-001"],
          battleArea: [
            { card: "ST19-12", as: "cendrill", dp: 11000 },
            { card: "TOKEN-Familiar-Token", as: "fodder", dp: 3000 },
          ],
        },
        1: { hand: ["AD1-001"], deck: ["AD1-001", "AD1-001"], security: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("cendrill"), "Blocker")).toBe(true);
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Familiar-Token")).toBe(false);
    expect(s.perm("cendrill").isSuspended).toBe(false);
    expect(s.events.some((event) => (event as { kind?: string }).kind === "attackDeclared")).toBe(true);
  });

  it("may decline playing the two Familiar Tokens when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST19-10", as: "host" }], hand: [{ card: "ST19-12", as: "cendrill" }] },
        1: {},
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("cendrill").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST19-12"));
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST19-12")).toBe(true);
    await settle(() => s.perm("host").topCard.cardId === "ST19-12");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Familiar-Token")).toBe(false);
  });
});
