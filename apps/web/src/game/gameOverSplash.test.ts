import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { GAME_OVER_REASONS, gameOverSplash, isGameOverReason } from "./gameOverSplash";

const OUTCOMES = ["win", "loss", "draw"] as const;

describe("gameOverSplash", () => {
  it("names a title and a reason line for every outcome and reason the protocol can send", () => {
    for (const outcome of OUTCOMES) {
      for (const reason of GAME_OVER_REASONS) {
        const splash = gameOverSplash(outcome, reason);
        expect(splash.tone, `${outcome}/${reason}`).toBe(outcome);
        expect(en[splash.titleKey], `${outcome}/${reason} title`).toBeTruthy();
        expect(en[splash.reasonKey], `${outcome}/${reason} reason`).toBeTruthy();
      }
    }
  });

  it("gives the same reason opposite wording on each side of the match", () => {
    expect(gameOverSplash("win", "surrender").reasonKey).not.toBe(gameOverSplash("loss", "surrender").reasonKey);
  });

  it("falls back to a real sentence for a reason it has not been taught", () => {
    // A protocol that grows a fifth reason must not print its raw enum name at
    // the player mid-splash.
    const splash = gameOverSplash("loss", "timeout");
    expect(en[splash.reasonKey]).toBeTruthy();
    expect(isGameOverReason("timeout")).toBe(false);
  });
});
