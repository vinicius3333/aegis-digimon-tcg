import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/EX4/EX4-059.js";
import "../../cards/EX4/EX4-065.js";
import { isInternalDescription } from "../effects/interpreter/describe.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const GRANTED_REPLAY = "[Granted] [On Deletion] You may play this card without paying the cost.";

describe("watcher clauses players read", () => {
  it("names a granted trigger by the clause its granting card quotes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-057", as: "antylamon" }],
          hand: [{ card: "EX4-059", as: "cherubimon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "EX4-065", as: "tridentGaia" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const cherubimonId = s.inst("cherubimon").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("antylamon").permanentId,
        instanceId: cherubimonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    const permanentId = s.perm("antylamon").permanentId;
    await settle(() => observe(s.engine).subscriptions("onDeletionOf", permanentId).length === 1);
    expect(observe(s.engine).subscriptions("onDeletionOf", permanentId)[0]?.printedClause).toBe(GRANTED_REPLAY);

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.events.some((event) => event.kind === "effectResolved" && event.description === GRANTED_REPLAY),
    );

    const announced = s.events.flatMap((event) =>
      event.kind === "effectTriggered" || event.kind === "effectResolved" ? [event.description] : [],
    );
    expect(announced).toContain(GRANTED_REPLAY);
    expect(announced.filter((description) => isInternalDescription(description))).toEqual([]);
  });
});
