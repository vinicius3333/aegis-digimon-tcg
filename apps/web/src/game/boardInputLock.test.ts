import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameScreenSource = readFileSync(new URL("./GameScreen.tsx", import.meta.url), "utf8");

describe("presentation cues and board actions", () => {
  it("does not install a presentation-owned input shield", () => {
    expect(gameScreenSource).not.toContain("BoardInputLock");
    expect(gameScreenSource).not.toContain("securityRevealPending");
    expect(gameScreenSource).not.toContain("cues.narrationLock");
  });

  it("keeps main actions behind live server state", () => {
    expect(gameScreenSource).toContain("const pendingServerDecision = Boolean(decision || state.pendingDecision);");
    expect(gameScreenSource).toContain("const mainActionBlocked = turnActionBlocked || state.phase !== Phase.Main;");
    for (const sender of ["playCard", "digivolve", "attack", "activateEffect"]) {
      const start = gameScreenSource.indexOf(`  const ${sender} = `);
      const end = gameScreenSource.indexOf("\n  };", start);
      expect(gameScreenSource.slice(start, end), `${sender} is unguarded`).toContain("if (mainActionBlocked) return;");
    }
  });

  it("keeps breeding and turn controls behind live phase, turn, and decision state", () => {
    expect(gameScreenSource).toContain("const breedingActionsOpen = breedingWindow && !turnActionBlocked;");
    expect(gameScreenSource).toContain("if (!breedingActionsOpen) return;");
    expect(gameScreenSource).toContain("covered={endPhaseBlocked ? true : undefined}");
    expect(gameScreenSource).toContain("onEndPhase={() => !endPhaseBlocked && room && intents.endPhase(room)}");
    expect(gameScreenSource).toContain("decision && decision.seat === viewerSeat");
  });
});
