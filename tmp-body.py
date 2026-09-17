p = "apps/web/src/game/GameScreen.tsx"
s = open(p).read()

s = s.replace("  const intents = matchIntents({", "  const matchSenders = matchIntents({", 1)
s = s.replace("  } = intents;\n", "  } = matchSenders;\n", 1)

start = s.index("  const overlays = (\n")
end = s.index("  /** What both battle rows put on a permanent; only the sweep's stagger differs. */")

new = """  const overlays = (
    <MatchOverlays
      state={state}
      viewer={you}
      opponent={opp}
      viewerSeat={viewerSeat}
      opponentName={shownOpp.displayName || t("game.opponent")}
      decision={decision}
      decisionView={decisionView}
      allPermanents={allPermanents}
      triggerDetails={triggerDetails}
      fateBadges={fateBadges}
      allowsPick={decisionAllowsPick}
      onTogglePick={toggleDecisionPick}
      combatWindows={combatWindows}
      combatWindowAnswers={combatWindowAnswers}
      scenes={{ securityBreak, securityClash, securityBranch, optionBranch, zoneShowcase }}
      collapseNotices={collapseNotices}
      log={log}
      signedIn={signedIn}
      opponentDropped={!vsBot && !opp.connected && !state.gameOver}
      gameOver={state.gameOver ? { result: gameOverResult, reason: gameOverReason } : undefined}
      overlays={overlayState}
      selection={selectionState}
      intents={matchSenders}
      actions={actions}
      playAnswers={playAnswers}
      appFusion={appFusion}
      handPreviewEntry={handPreviewEntry}
      handPreviewActions={handPreviewActions}
      appFusionHostIdsOf={appFusionHostIdsOf}
      cardMenuPermanent={cardMenuPermanent}
      stackViewPermanent={stackViewPermanent}
      keywordLabels={demoConnection?.keywordLabels}
      narrowGameLayout={narrowGameLayout}
      isMyTurn={isMyTurn}
      linkTargetsOfPermanent={linkTargetsOfPermanent}
      handEntries={handEntries}
      shownHandEntries={shownHandEntries}
      viewerTurnOrder={viewerTurnOrder}
      boardRef={boardRef}
      permanentRefs={permRefs}
      handDockRef={yourHandDockRef}
      onExit={onExit}
    />
  );

"""
s = s[:start] + new + s[end:]
s = s.replace(
    'import { MemoryBand } from "./screen/layout/MemoryBand";',
    'import { MatchOverlays } from "./screen/layout/MatchOverlays";\nimport { MemoryBand } from "./screen/layout/MemoryBand";',
    1,
)
open(p, "w").write(s)

p = "apps/web/src/game/screen/layout/MatchOverlays.tsx"
s = open(p).read()
s = s.replace(
    'import type { GameOverOutcome } from "../../gameOverSplash";',
    'import type { GameOverOutcome } from "../../gameOverSplash";\nimport type { TurnOrder } from "../../overlay";',
)
s = s.replace("  viewerTurnOrder: number | undefined;", "  viewerTurnOrder: TurnOrder | undefined;")
open(p, "w").write(s)
print("ok")
