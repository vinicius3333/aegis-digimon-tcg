import { describe, expect, it } from "vitest";
import { setupEngine } from "../engine/testkit/harness.js";
import { enumerateMainPhaseCandidates } from "./candidates.js";
import { buildBotView } from "./view.js";
import "../cards/index.js";

for (const seat of [0, 1] as const) {
  describe(`authoritative evolution affordances seat ${seat}`, () => {
    it.each([false, true])(
      "requires a 10000 DP opposing Digimon for Huckmon to Jesmon (present=%s)",
      async (present) => {
        const s = setupEngine({
          [seat]: { battleArea: [{ card: "EX13-009", as: "host" }], hand: [{ card: "BT23-013", as: "result" }] },
          [seat === 0 ? 1 : 0]: { battleArea: present ? ["BT22-013"] : [] },
        });
        s.state.turnSeat = seat;
        s.state.memory = 5;
        await s.ready();
        const routes = enumerateMainPhaseCandidates(buildBotView(s.state, seat)!).filter(
          (candidate) => candidate.intent.type === "digivolve",
        );
        expect(routes.length > 0).toBe(present);
        if (present) expect(s.engine.applyIntent(seat, routes[0]!.intent)).toEqual({ ok: true });
      },
    );
    it.each([3, 4])("requires at most three security for Rie to LordKnightmon (security=%s)", async (security) => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT22-090", as: "host" }],
            hand: [{ card: "EX13-064", as: "result" }],
            security: Array.from({ length: security }, () => "BT1-001"),
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 5;
      await s.ready();
      const routes = enumerateMainPhaseCandidates(buildBotView(s.state, seat)!).filter(
        (candidate) => candidate.intent.type === "digivolve",
      );
      expect(routes.length > 0).toBe(security === 3);
      if (security === 3) expect(s.engine.applyIntent(seat, routes[0]!.intent)).toEqual({ ok: true });
    });
  });
}
