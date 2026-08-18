import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST14-11.js";

describe("ST14-11 Ai & Mako", () => {
  it("can suspend and gain memory after a purple digivolution with an empty hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "BT12-085", as: "purple" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("purple").permanentId,
    });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
