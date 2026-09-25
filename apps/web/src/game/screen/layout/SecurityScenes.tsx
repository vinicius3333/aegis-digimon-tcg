/* The scenes that take the centre of the screen: a shield breaking, the clash itself,
   a revealed card's detour to the side, and the showcase a played card gets. None of
   them survives the end of the match, so a finished game shows none. */

import { SecurityBranch, SecurityClash, SecurityEdgeFlash } from "../../SecurityClashView";
import { ZoneShowcase } from "../../ZoneShowcase";
import { RevealShowcase } from "../../RevealShowcase";
import type { RevealShowcase as RevealShowcaseCue } from "../../match/present/revealShowcases";
import type { SecurityBranchScene, SecurityClashScene } from "../../securityClash";
import type { ZoneShowcase as ZoneShowcaseCue } from "../../showcases";
import type { SecurityBreakCue } from "../../match/types";

export function SecurityScenes({
  securityBreak,
  securityClash,
  securityBranch,
  optionBranch,
  zoneShowcase,
  revealShowcase,
  compact,
}: {
  securityBreak: SecurityBreakCue | null;
  securityClash: SecurityClashScene | null;
  securityBranch: SecurityBranchScene | null;
  /** A used Option takes the same detour a revealed security card does. */
  optionBranch: SecurityBranchScene | null;
  zoneShowcase: ZoneShowcaseCue | null;
  revealShowcase: RevealShowcaseCue | null;
  compact: boolean;
}) {
  return (
    <>
      {securityBreak && securityBreak.phase === "break" ? (
        <SecurityEdgeFlash key={securityBreak.key} scene={securityBreak} />
      ) : null}

      {securityClash ? <SecurityClash key={securityClash.key} scene={securityClash} /> : null}

      {securityBranch ? <SecurityBranch key={securityBranch.key} scene={securityBranch} compact={compact} /> : null}

      {optionBranch ? (
        <SecurityBranch key={`option-${optionBranch.key}`} scene={optionBranch} compact={compact} />
      ) : null}

      {zoneShowcase && !securityClash ? <ZoneShowcase key={zoneShowcase.key} showcase={zoneShowcase} /> : null}

      {revealShowcase && !securityClash ? (
        <RevealShowcase key={`reveal-${revealShowcase.key}`} showcase={revealShowcase} />
      ) : null}
    </>
  );
}
