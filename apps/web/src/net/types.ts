/**
 * Join payload sent to client.joinOrCreate(ROOM_TYPE, options). Mirrors
 * AegisJoinOptions declared on the server room (API-CONTRACT.md section 1). The
 * web package may not import @aegis/api, so the shape is restated here; both sides
 * must agree on it.
 */
export interface AegisJoinOptions {
  displayName: string;
  deck: { mainDeck: string[]; eggDeck: string[]; mainDeckArts?: string[]; eggDeckArts?: string[] }; // arrays of card ids
  deckId?: string;
  deckName?: string;
  /** Joins a private room by code, or reopens a finished one under its code. */
  roomCode?: string;
  ranked?: boolean;
  betaBattleMode?: boolean;
  authTicket?: string;
  /** Dev-only: ask a bot room for a hand-laid board instead of the pre-game procedure. */
  devScenario?:
    | "battle"
    | "arena"
    | "arena-aegiochus-dark-assembly"
    | "arena-mervamon-effect-assembly"
    | "arena-alliance-20"
    | "arena-bt11-analogman-redirect-timing"
    | "arena-bt11-rina-ulforce-immunity"
    | "arena-bt20-grademon-redirect"
    | "arena-bt20-invisimon-empty-stack"
    | "arena-bt20-takemikazuchi-turn-continue"
    | "arena-bt16-phoenixmon-x-antibody-name"
    | "arena-bt21-davis-top-stack"
    | "arena-bt21-dogatchmon-link-attack"
    | "arena-bt26-chronomon-dm-succession"
    | "arena-face-up-security"
    | "arena-ex13-grademon-immunity"
    | "arena-bt8-digimon-emperor-breeding-memory"
    | "arena-ex13-gotsumon-blocker-search"
    | "arena-mightyaxe-mode-digixros"
    | "arena-hand-reconnect-sync"
    | "arena-p097-zubamon-reveal-order"
    | "arena-p246-motimon-kingetemon"
    | "arena-p246-motimon-after-de-digivolve"
    | "arena-de-digivolve-visibility"
    | "arena-st24-dna-charge-start-of-main"
    | "arena-ex13-giromon-block-triggers"
    | "arena-ex13-deletion-trigger-ordering"
    | "arena-gate-deadly-sins-effect-order"
    | "arena-ex13-kings-opponent-sukamon"
    | "arena-ex13-kingsukamon-immunity-lapse"
    | "arena-ex13-examon"
    | "arena-ex13-examon-battle-win-timing"
    | "arena-ex13-chirinmon-cost-choice"
    | "arena-sukamon-transform-digivolve"
    | "arena-sukamon-transform-digivolve-viewer"
    | "arena-ex5-attack-priority"
    | "arena-ex5-biting-crush-delay"
    | "arena-p108-training-delay-no-target"
    | "arena-ex10-god-grade-raising-color"
    | "arena-ex10-malomyotismon-trash-main"
    | "arena-issue-4888-app-fusion"
    | "arena-issue-4889-weregarurumon-dna"
    | "arena-paildramon-dna-inheritance"
    | "arena-bt24-silphymon-dna"
    | "arena-issue-4890-reina-deletion"
    | "arena-issue-4891-seiten-on-play"
    | "arena-issue-4892-effect-digixros"
    | "arena-issue-4893-seiten-evo-cost"
    | "arena-issue-4894-jesmon-token-limit"
    | "arena-ex11-ryutaro-suspended"
    | "arena-junomon-opponent-target"
    | "arena-jupitermon-siren"
    | "arena-magnamon-x"
    | "arena-reboot-timing"
    | "arena-sagasol-effect-assembly"
    | "arena-sagasol-etemon-protected-dp"
    | "arena-sagasol-guard-source"
    | "arena-ex13-magnamon-end-turn"
    | "arena-seven-code-link-dp"
    | "arena-suspend-lock-block"
    | "arena-vortex-target-legality"
    | "arena-vortexdramon"
    | "card-bugs"
    | "security-battle"
    | "security-chain";
}
