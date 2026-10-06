import { CardKind, CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { loadDeckInto, setSecurityStack, type Decklist } from "./setup.js";
import {
  clearBattleArea,
  clearZone,
  insertCard,
  linkCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
} from "./state/access.js";

type FieldCard = { card: string; under?: string[]; linked?: string[]; faceDownUnder?: boolean; suspended?: boolean };
type PlayerLayout = {
  field?: FieldCard[];
  breeding?: FieldCard;
  hand?: string[];
  trash?: string[];
  security?: string[];
  faceUpSecurity?: boolean;
};
type Layout = { players: readonly [PlayerLayout, PlayerLayout]; memory?: number };

// Reduced boards for reported issues. Each runs in the ordinary turn loop.
const ISSUE_LAYOUTS = {
  "arena-examon-bt23-partition-choice": {
    memory: 3,
    players: [
      {
        field: [{ card: "BT23-047", under: ["EX13-005", "BT20-007", "BT21-046", "EX13-018", "EX13-021", "BT20-042"] }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "AD1-011" }],
        hand: ["AD1-024"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556831312008974437-jesmon-gankoomon-immunity": {
    memory: 3,
    players: [
      {
        field: [{ card: "BT23-013" }],
        hand: ["BT20-057", "BT20-059"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "EX13-018" }],
        hand: ["EX13-021"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon": {
    memory: 8,
    players: [
      {
        field: [
          { card: "P-213", under: ["BT24-003", "P-194"] },
          { card: "BT24-022", under: ["BT24-031"] },
        ],
        hand: ["BT24-101"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon-zero": {
    memory: 8,
    players: [
      {
        field: [
          { card: "P-213", under: ["BT24-003", "P-194"] },
          { card: "BT24-022", under: ["BT24-031"] },
        ],
        hand: ["BT24-101"],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-discord-1556810241952194590-cerberusmon-alphamon": {
    memory: 8,
    players: [
      {
        field: [{ card: "EX13-055", under: ["EX13-049"] }],
        hand: ["EX13-057", "EX13-060"],
        security: ["BT1-009", "BT1-010", "BT1-013"],
      },
      {
        field: [{ card: "BT26-090" }],
        hand: ["BT26-056", "BT1-009"],
        security: ["BT1-009", "BT1-010", "BT1-013"],
      },
    ],
  },
  "arena-discord-1556811259867955282-patamon-zero": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT1-009", "BT1-010", "BT1-013"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556811259867955282-patamon-one": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT14-035", "BT1-009", "BT1-013"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556811259867955282-patamon-multiple": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT14-035", "BT14-035", "BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556798361435373630-mococomon-once-per-turn": {
    memory: 10,
    players: [
      {
        field: [{ card: "EX12-043", under: ["EX12-002"] }],
        hand: ["EX12-045", "EX12-056", "EX12-034", "EX12-034"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "BT24-101" }, { card: "BT24-101", under: ["BT26-029"] }],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556782829713621082-digilab-breeding": {
    memory: 5,
    players: [
      { breeding: { card: "EX13-017", under: ["EX13-002"] }, hand: ["P-225"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772689731915896-fly-bullet-hand": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-083" }], hand: ["BT25-085"] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772689731915896-fly-bullet-sources": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-085", under: ["BT25-085"] }] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-asuna": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-092" }, { card: "BT25-083", under: ["BT25-100"] }], trash: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-image-training": {
    memory: 8,
    players: [
      { field: [{ card: "LM-056" }, { card: "BT25-083" }], hand: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-breathing-training": {
    memory: 8,
    players: [
      { field: [{ card: "LM-062" }, { card: "BT25-083" }], hand: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-pagumon": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-083", under: ["BT25-005"] }], hand: ["BT25-085", "BT25-085"], trash: ["EX7-066"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556745762682183811-giant-slayer-execute": {
    players: [
      { hand: ["BT26-085", "BT26-060"], trash: ["BT26-078"], security: ["BT1-009", "BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556745762682183811-holy-succession": {
    players: [
      {
        hand: ["BT26-085"],
        trash: ["BT26-078", "BT26-060", "BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 2,
  },
  "arena-discord-1556702519952932885-rosemon-burst": {
    players: [
      { field: [{ card: "BT26-049" }, { card: "BT26-091" }], hand: ["BT26-050"] },
      { field: [{ card: "BT1-009" }, { card: "BT1-010" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556702519952932885-yoshino": {
    players: [
      { field: [{ card: "BT26-091" }, { card: "ST24-09" }], hand: ["ST24-09", "ST24-10"] },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556702668754387095-machinedramon": {
    players: [
      {
        field: [{ card: "BT12-072", under: ["EX12-054", "EX12-055", "EX12-059"] }],
        hand: ["EX12-054", "EX12-055"],
        trash: ["EX12-054"],
      },
      {
        field: [{ card: "EX12-054", under: ["BT1-009"] }],
        security: ["ST1-16", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556703230166175754-engage": {
    players: [
      { field: [{ card: "EX12-060" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556688029731528804-jesmon": {
    players: [
      { field: [{ card: "BT23-013" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556715328610762844-alphamon": {
    players: [
      { hand: ["BT13-075"], trash: ["BT9-055"] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556716432111304824-dantemon": {
    players: [
      {
        hand: ["BT26-086"],
        trash: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"],
      },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556715929973424128-block-timing": {
    players: [
      {
        field: [{ card: "EX12-076", under: ["EX12-004", "EX12-031"] }],
        hand: ["EX12-047"],
        security: ["EX12-074"],
        faceUpSecurity: true,
      },
      { field: [{ card: "BT23-077" }, { card: "BT1-009" }], security: [] },
    ],
    memory: 3,
  },

  "arena-discord-1556732255148179569-drasil-turn": {
    players: [
      {
        breeding: { card: "BT13-007", under: ["BT20-102"] },
        field: [{ card: "EX11-053", under: ["EX12-053"] }],
        hand: ["BT13-087", "EX5-048"],
        security: ["BT1-009"],
      },
      { breeding: { card: "BT1-001" }, field: [{ card: "ST1-10" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },

  "arena-issue-4965-optional-raid": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-07" }] },
      { field: [{ card: "BT1-080" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4967-assembly-with-dna": {
    memory: 10,
    players: [
      {
        field: [{ card: "ST20-11" }, { card: "ST21-11" }],
        hand: ["EX13-016"],
        trash: ["ST20-11", "ST21-11", "ST20-10", "ST21-10"],
      },
      {},
    ],
  },
  "arena-issue-4968-hand-trash-draw": {
    memory: 10,
    players: [
      { hand: ["BT11-057", "BT24-045", "BT26-069", "BT1-010", "BT1-011"], field: [{ card: "BT1-076" }] },
      { field: [{ card: "BT1-010" }, { card: "BT1-011" }] },
    ],
  },
  "arena-issue-4969-grandgalemon-dp": {
    memory: 10,
    players: [{ hand: ["ST22-13"] }, { field: [{ card: "BT1-009" }] }],
  },
  "arena-issue-4971-imperial-effect-evolution": {
    memory: 10,
    players: [{ field: [{ card: "EX13-008" }], hand: ["BT21-046", "EX13-018"] }, { field: [{ card: "AD1-024" }] }],
  },
  "arena-issue-4972-burst-marcus-rule": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-07" }, { card: "ST24-13" }], hand: ["BT25-104"] },
      { field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4973-dual-option-immunity": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-13" }], hand: ["ST24-07"] },
      { field: [{ card: "ST23-08" }], hand: ["ST23-09"] },
    ],
  },
  "arena-issue-4974-gaiomon-reboot": {
    players: [
      { field: [{ card: "BT9-068", under: ["BT11-069"], suspended: true }] },
      { field: [{ card: "BT1-010", suspended: true }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4977-kingetemon-continuous": {
    memory: 10,
    players: [
      {
        field: [{ card: "EX13-031" }, { card: "EX13-028" }, { card: "EX13-028" }],
        hand: ["EX13-035"],
        trash: ["EX13-027", "EX13-027"],
      },
      { field: [{ card: "BT1-080" }, { card: "EX13-023" }] },
    ],
  },
  "arena-issue-4978-rosemon-tamer-reaction": {
    memory: 10,
    players: [
      {
        field: [{ card: "ST24-10" }, { card: "ST24-14", under: ["BT1-009", "BT1-010"], faceDownUnder: true }],
        hand: ["BT26-049", "ST24-03"],
      },
      { field: [{ card: "BT1-080" }, { card: "BT1-080" }] },
    ],
  },
  "arena-issue-4979-weather-detach": {
    memory: 10,
    players: [{ field: [{ card: "BT26-037", linked: ["BT26-063"] }] }, { hand: ["EX9-018"], trash: ["BT1-010"] }],
  },
  "arena-issue-4981-dantemon-seven-code": {
    memory: 1,
    players: [
      {
        field: [{ card: "BT26-010", under: ["BT26-007"] }],
        hand: ["BT26-102", "BT26-086"],
        trash: ["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-084", "BT26-010", "BT26-063"],
      },
      {
        field: [{ card: "BT1-080" }, { card: "BT1-084" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"],
      },
    ],
  },
  "arena-issue-4983-feedback-form": { players: [{ field: [{ card: "BT1-010" }] }, { field: [{ card: "BT1-011" }] }] },
  "arena-issue-4984-super-hacking-security": {
    players: [
      { field: [{ card: "BT24-099" }, { card: "BT26-010" }], security: ["BT26-084", "BT1-010", "BT1-011"] },
      { field: [{ card: "BT1-010" }] },
    ],
  },
  "arena-issue-4985-double-alliance": {
    memory: 10,
    players: [
      { field: [{ card: "EX13-012" }, { card: "ST12-12" }, { card: "BT6-082" }], hand: ["BT23-013", "BT6-084"] },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4988-examon-tamers": {
    memory: 10,
    players: [
      { field: [{ card: "BT1-080" }, { card: "BT1-044" }], hand: ["BT23-047"] },
      { field: [{ card: "ST24-13" }, { card: "ST24-14" }] },
    ],
  },
  "arena-issue-4989-linked-card-labels": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT26-010", linked: ["BT26-019"] }, { card: "BT26-028" }],
        hand: ["BT26-102", "BT26-086", "BT26-084"],
        trash: ["BT26-037", "BT26-051", "BT26-063", "BT26-084"],
      },
      {},
    ],
  },
  "arena-issue-4990-end-of-turn-label": {
    memory: 1,
    players: [
      {
        field: [{ card: "BT9-111", under: ["BT9-062", "BT9-064"] }, { card: "EX13-013" }],
        hand: ["BT1-009", "BT1-009"],
      },
      { field: [{ card: "BT1-011" }] },
    ],
  },
  "arena-issue-4905-magnamon-merciful-colors": {
    memory: 6,
    players: [
      { hand: ["P-117", "ST17-13"] },
      {
        field: [{ card: "EX13-077", under: ["ST20-06", "ST21-08", "ST20-02", "BT21-061", "EX9-019", "AD1-025"] }],
      },
    ],
  },
  "arena-issue-4914-blanc-dual-option": {
    players: [
      { field: [{ card: "EX12-051" }], hand: ["EX12-052", "BT1-082"] },
      { field: [{ card: "BT6-082" }, { card: "BT1-080" }, { card: "BT5-091" }], hand: ["EX13-065"] },
    ],
  },
  "arena-issue-4948-sukamon-blast-legality": {
    players: [
      { field: [{ card: "BT1-009" }], hand: ["EX13-031", "BT3-061"] },
      {
        field: [{ card: "BT16-028" }, { card: "BT2-063" }],
        hand: ["BT17-077", "ST15-12"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4947-physical-training-reaction": {
    players: [
      { field: [{ card: "P-105" }, { card: "BT1-051" }], hand: ["BT1-060"] },
      { field: [{ card: "BT16-028" }, { card: "BT1-085" }], hand: ["BT16-027"] },
    ],
  },
  "arena-issue-4957-gankoomon-dual-sources": {
    players: [
      { field: [{ card: "EX13-061", under: ["EX13-065", "EX13-066"] }], trash: ["ST12-12"] },
      { field: [{ card: "BT1-080", under: ["BT1-013", "BT1-020"] }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4910-diarbbitmon-dual-option": {
    players: [
      { field: [{ card: "EX12-051" }], hand: ["EX12-052", "BT1-082"] },
      {
        field: [{ card: "EX13-061", under: ["EX13-065", "EX13-066"] }, { card: "BT6-082" }],
        trash: ["ST12-12"],
        hand: ["EX13-065"],
      },
    ],
  },
  "arena-issue-4939-demon-lord-free-reduction": {
    players: [
      {
        breeding: { card: "EX6-006", under: ["EX6-006", "EX6-059"] },
        field: [{ card: "EX6-069" }, { card: "EX6-058" }, { card: "BT1-080" }, { card: "BT1-009" }],
        hand: ["EX6-058", "BT1-087"],
      },
      {},
    ],
  },
  "arena-issue-4954-lordknightmon-inspector": { players: [{ field: [{ card: "BT5-042" }], hand: ["AD1-018"] }, {}] },
  "arena-issue-4958-card-images": {
    players: [
      { field: [{ card: "BT1-010" }, { card: "BT5-092" }], hand: ["EX13-065", "BT25-104", "AD1-018"] },
      { field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4943-browser-translation": {
    players: [{ field: [{ card: "BT1-010" }], hand: ["BT1-020", "BT1-013"] }, { field: [{ card: "BT1-080" }] }],
  },
  "arena-issue-4964-burst-own-tamer": {
    players: [
      { field: [{ card: "BT12-043" }], hand: ["BT25-104", "BT1-085"] },
      { hand: ["BT1-087"], field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4962-seiten-ex12-assembly": {
    players: [{ field: [{ card: "EX12-043" }], hand: ["EX12-048"], trash: ["EX12-015", "EX12-029", "EX12-056"] }, {}],
  },
  "arena-issue-4961-takato-raid-attack": {
    players: [
      { field: [{ card: "BT19-080" }, { card: "ST7-08" }], hand: ["EX2-011"] },
      { field: [{ card: "BT1-080" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4955-minervamon-dedigivolve": {
    players: [
      { field: [{ card: "BT26-029" }], hand: ["BT24-041"] },
      { field: [{ card: "BT1-080", under: ["BT1-013", "BT1-020"] }] },
    ],
  },
  "arena-issue-4953-nokia-warp-reduction": {
    players: [
      { field: [{ card: "BT5-092" }, { card: "BT1-010" }, { card: "BT1-029" }], hand: ["BT22-013", "BT22-026"] },
      {},
    ],
  },
  "arena-issue-4952-kotemon-piercing": {
    players: [
      { breeding: { card: "BT26-008", under: ["BT26-001"] }, field: [{ card: "BT26-033" }] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-4951-okuwamon-inherited": {
    players: [
      { field: [{ card: "BT9-055", under: ["P-075"] }], hand: ["BT1-009"] },
      { field: [{ card: "BT1-024", suspended: true }] },
    ],
  },
  "arena-issue-4950-davis-ken-dna-sources": {
    players: [
      { field: [{ card: "BT16-085" }, { card: "ST9-04" }, { card: "ST9-09" }], hand: ["ST9-05"] },
      { field: [{ card: "BT1-080", under: ["BT1-020", "BT1-013", "BT1-010"] }] },
    ],
  },
  "arena-issue-4949-paladin-battle-comparison": {
    players: [
      { hand: ["EX13-076"], trash: ["EX13-045", "BT23-013", "EX13-061", "BT17-077", "BT22-067", "EX13-036"] },
      { field: [{ card: "BT26-028", under: ["EX13-055"] }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4946-slayerdramon-assembly-order": {
    players: [{ hand: ["EX13-024"], trash: ["EX13-021", "EX13-018", "EX13-008"] }, {}],
  },
  "arena-issue-4942-jesmon-double-alliance": {
    players: [
      { field: [{ card: "EX13-012" }, { card: "ST12-12" }, { card: "BT6-082" }], hand: ["BT23-013", "BT6-084"] },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4941-candlemon-top-inheritance": {
    players: [
      { field: [{ card: "BT18-030" }, { card: "BT1-009" }] },
      { field: [{ card: "BT1-024" }], hand: ["BT6-095"] },
    ],
  },
  "arena-issue-4940-lilithmon-delete-cost": {
    players: [{ field: [{ card: "BT26-028" }], hand: ["BT26-063"] }, { field: [{ card: "EX6-057" }] }],
  },
  "arena-issue-4938-ruli-optional-reduction": {
    players: [{ field: [{ card: "RB1-034" }, { card: "RB1-022" }], hand: ["RB1-024"] }, {}],
    memory: 5,
  },
  "arena-issue-4937-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["EX13-057", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4937-bt20-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["BT20-053", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4936-examon-repeat-barrier": {
    players: [
      { field: [{ card: "BT1-080" }, { card: "ST2-10" }], hand: ["EX13-045"] },
      {
        field: [{ card: "EX13-060", under: ["EX13-055"], suspended: true }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4935-blanc-arts-guard": {
    players: [
      { field: [{ card: "BT23-076" }, { card: "BT1-080" }], hand: ["EX13-065"] },
      { field: [{ card: "BT1-024" }], hand: ["ST1-16"] },
    ],
  },
  "arena-issue-4933-lilamon-host": {
    players: [
      { field: [{ card: "BT1-009" }], hand: ["BT6-095"] },
      {
        field: [{ card: "ST24-11", under: ["ST24-10"] }, { card: "ST24-03" }, { card: "ST24-13", under: ["BT1-001"] }],
      },
    ],
  },
  "arena-issue-4932-kentaurosmon-security": {
    players: [
      { field: [{ card: "ST24-10" }], hand: ["EX13-036"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      { field: [{ card: "BT1-024" }, { card: "BT1-024" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4931-lordknightmon-reduction": { players: [{ field: [{ card: "BT5-042" }], hand: ["AD1-018"] }, {}] },
  "arena-issue-4930-venusmon-opponent-cost": {
    players: [
      { field: [{ card: "BT6-007" }], hand: ["BT6-095"] },
      { field: [{ card: "BT24-040", under: ["BT24-033"] }, { card: "BT24-034" }] },
    ],
  },
  "arena-issue-4929-noir-single-target": {
    players: [
      { field: [{ card: "BT6-082" }, { card: "ST12-12" }, { card: "BT6-084" }], hand: ["EX13-066"] },
      {
        field: [
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
        ],
      },
    ],
  },
  "arena-issue-4926-battle-priority": {
    players: [
      { field: [{ card: "BT23-047", under: ["EX13-041"] }] },
      {
        field: [
          { card: "BT5-042", suspended: true },
          { card: "EX13-074", suspended: true },
        ],
        hand: ["EX13-058"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4924-revelation-security-faces": {
    players: [{ field: [{ card: "BT1-045" }], hand: ["BT15-092"], security: ["BT15-033", "BT15-033", "BT1-009"] }, {}],
  },
  "arena-issue-4923-seiten-assembly": {
    players: [{ hand: ["EX12-048"], trash: ["EX12-015", "EX12-029", "BT12-041"] }, {}],
  },
  "arena-issue-4921-homeros-late-arrival": {
    players: [{ field: [{ card: "BT26-029" }, { card: "BT26-090" }], hand: ["BT26-033", "BT24-102"] }, {}],
  },
  "arena-issue-4919-seventh-lightning-cost": {
    players: [
      { field: [{ card: "BT15-077" }], hand: ["BT15-081"], trash: ["BT15-100"] },
      { field: [{ card: "BT15-079" }] },
    ],
  },
  "arena-issue-4918-lordknightmon-player-attack": {
    players: [
      { field: [{ card: "EX13-074", under: ["EX13-058", "EX13-058", "EX13-058"] }], hand: ["BT22-067"] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-4917-biting-crush-placement": {
    players: [{ field: [{ card: "BT2-067" }], hand: ["EX5-069", "EX5-063"] }, {}],
  },
  "arena-issue-4916-raid-target-block": { players: [{ field: [{ card: "AD1-008" }] }, { hand: ["EX13-062"] }] },
  "arena-issue-4915-junomon-homeros": {
    players: [
      { field: [{ card: "BT1-024" }] },
      { field: [{ card: "BT25-044" }], hand: ["BT24-102"], security: ["BT1-009"] },
    ],
  },
  "arena-issue-4913-cool-boy-proto-form": {
    players: [{ field: [{ card: "EX8-026" }, { card: "BT9-092" }], hand: ["EX5-070", "BT20-028"] }, {}],
  },
  "arena-issue-4912-deep-savers-battle": {
    players: [
      { field: [{ card: "EX13-024" }], hand: ["EX13-045"] },
      { field: [{ card: "EX8-026", suspended: true }], security: ["EX8-068"], faceUpSecurity: true },
    ],
    memory: 4,
  },
  "arena-issue-4911-mervamon-multiple-checks": {
    players: [
      {
        field: [
          { card: "BT26-081" },
          { card: "BT26-081" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
        ],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4907-takato-end-turn": {
    players: [
      {
        field: [{ card: "BT17-080" }, { card: "EX13-015", under: ["AD1-003", "EX13-007"] }],
        hand: ["BT17-016"],
        trash: ["BT17-010", "BT17-013", "EX13-007"],
      },
      { field: [{ card: "BT13-103" }, { card: "BT13-088" }], hand: ["BT1-009"] },
    ],
  },
} satisfies Record<string, Layout>;

export type IssueReproScenarioId = keyof typeof ISSUE_LAYOUTS;
export const ISSUE_REPRO_SCENARIO_IDS = Object.keys(ISSUE_LAYOUTS) as IssueReproScenarioId[];

export function layIssueReproScenario(
  id: IssueReproScenarioId,
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  const layout: Layout = ISSUE_LAYOUTS[id];
  function card(cardId: string, seat: Seat, zone: string, index: number, faceUp: boolean): CardInstance {
    const instance = new CardInstance();
    instance.instanceId = `${id}-${seat}-${zone}-${index}`;
    instance.cardId = cardId;
    instance.ownerSeat = seat;
    instance.faceUp = faceUp;
    return instance;
  }
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    setSecurityStack(player);
    const spec = layout.players[seat];
    clearZone(player, Zone.Hand);
    clearZone(player, Zone.Trash);
    clearBattleArea(player);
    setBreeding(player, undefined);
    for (const [index, cardId] of (spec.hand ?? []).entries())
      insertCard(player, Zone.Hand, card(cardId, seat, "hand", index, false));
    for (const [index, cardId] of (spec.trash ?? []).entries())
      insertCard(player, Zone.Trash, card(cardId, seat, "trash", index, true));
    if (spec.security !== undefined) {
      clearZone(player, Zone.Security);
      for (const [index, cardId] of spec.security.entries())
        insertCard(player, Zone.Security, card(cardId, seat, "security", index, spec.faceUpSecurity === true));
    }
    for (const [index, field] of [...(spec.field ?? []), ...(spec.breeding ? [spec.breeding] : [])].entries()) {
      const permanent = new Permanent();
      permanent.permanentId = `${id}-${seat}-field-${index}`;
      permanent.controllerSeat = seat;
      setTopCard(permanent, card(field.card, seat, "field", index, true));
      permanent.enterFieldTurnCount = -1;
      permanent.isSuspended = field.suspended === true;
      permanent.baseDP = getCardDefinition(field.card)?.dp ?? 0;
      permanent.currentDP = permanent.baseDP;
      permanent.placedByEffect = getCardDefinition(field.card)?.kinds.includes(CardKind.Option) === true;
      for (const [sourceIndex, cardId] of (field.under ?? []).entries())
        pushOnStack(permanent, card(cardId, seat, `source-${index}`, sourceIndex, field.faceDownUnder !== true));
      for (const [linkIndex, cardId] of (field.linked ?? []).entries())
        linkCard(permanent, card(cardId, seat, `linked-${index}`, linkIndex, true), "bottom");
      if (field === spec.breeding) {
        permanent.inBreeding = true;
        setBreeding(player, permanent);
      } else placePermanent(player, permanent);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = layout.memory ?? 10;
}
