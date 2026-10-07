import type { arenaEn } from "./arena.en";

export const arenaEs: Record<keyof typeof arenaEn, string> = {
  "redesign.arena.look.open": "Configuración de la partida",
  "redesign.arena.look.title": "Configuración de la partida",
  "redesign.arena.look.description":
    "Colores del tablero, campo de batalla y sonido. Los cambios se aplican al instante.",
  "redesign.arena.audio.title": "Sonido",
  "redesign.arena.audio.music": "Música",
  "redesign.arena.audio.musicTrack": "Banda sonora",
  "redesign.arena.audio.musicVolume": "Volumen de la música",
  "redesign.arena.audio.effects": "Efectos de sonido y avisos",
  "redesign.arena.audio.effectsVolume": "Volumen de los efectos",
  "redesign.arena.badge.stackTitle": "Pila de digievolución",
  "redesign.arena.badge.stack": "{count} cartas de digievolución debajo de este Digimon.",
  "redesign.arena.badge.dpTitle": "{dp} DP",
  "redesign.arena.badge.dpUp": "{base} DP impresos, aumentados en {amount} por efectos.",
  "redesign.arena.badge.dpDown": "{base} DP impresos, reducidos en {amount} por efectos.",
  "redesign.arena.badge.dpChanged": "Hay efectos que cambiaron el DP de este Digimon.",
  "redesign.arena.badge.moreTitle": "Más efectos en este Digimon",
  "redesign.arena.badge.keywordsMore": "{count} palabras clave más. Abre la carta para leerlas todas.",
  "redesign.arena.restriction.immuneToOpponentEffects": "Los efectos de tu oponente no pueden afectar a este Digimon.",
  "redesign.arena.restriction.immuneToOpponentDigimonEffects":
    "Los efectos de los Digimon de tu oponente no pueden afectar a este Digimon.",
  "redesign.arena.restriction.immuneToOpponentOptionEffects":
    "Los efectos de las cartas Option de tu oponente no pueden afectar a este Digimon.",
  "redesign.arena.restriction.immuneToOpponentTamerEffects":
    "Los efectos de los Tamers de tu oponente no pueden afectar a este Digimon.",
  "redesign.arena.restriction.protectedFromDpReduction":
    "Los efectos de tu oponente no pueden reducir el DP de este Digimon.",
  "redesign.arena.restriction.protectedFromDeDigivolve":
    "Los efectos de tu oponente no pueden descartar cartas de la parte superior de este Digimon.",
  "redesign.arena.restriction.protectedFromEffectDeletion":
    "Los efectos de tu oponente no pueden eliminar a este Digimon.",
  "redesign.arena.restriction.protectedFromEffectReturn":
    "Los efectos de tu oponente no pueden devolver a este Digimon a la mano ni al deck.",
  "redesign.arena.restriction.attacksAtStartOfMainPhase":
    "Un efecto hace que este Digimon ataque al inicio de su fase principal, si puede.",
  "redesign.arena.restriction.cannotAttack": "Un efecto impide que este Digimon ataque.",
  "redesign.arena.restriction.cannotBlock": "Un efecto impide que este Digimon bloquee.",
  "redesign.arena.restriction.cannotSuspend": "Un efecto impide que este Digimon se suspenda.",
  "redesign.arena.restriction.cannotUnsuspend":
    "Un efecto mantiene a este Digimon suspendido en la fase de reactivación.",
  "redesign.arena.restriction.cannotDigivolve": "Un efecto impide que esta carta digievolucione.",
  "redesign.arena.restriction.cannotActivateWhenDigivolving":
    "Un efecto impide que se activen los efectos [When Digivolving] de este Digimon.",
  "redesign.arena.keyword.Blocker":
    "Cuando un Digimon del oponente ataca, puedes suspender este Digimon para obligar al oponente a atacarlo a él en su lugar.",
  "redesign.arena.keyword.SecurityAttackUp": "Este Digimon revisa {count} carta(s) de seguridad adicional(es).",
  "redesign.arena.keyword.SecurityAttackDown": "Este Digimon revisa {count} carta(s) de seguridad menos.",
  "redesign.arena.keyword.SecurityAttack": "Cambia cuántas cartas de seguridad revisa este Digimon cuando ataca.",
  "redesign.arena.keyword.Recovery": "Coloca las X carta(s) superiores de tu deck encima de tu pila de seguridad.",
  "redesign.arena.keyword.Piercing":
    "Cuando este Digimon ataca, elimina a un Digimon del oponente y sobrevive a la batalla, realiza las revisiones de seguridad que haría normalmente.",
  "redesign.arena.keyword.Draw": "Roba X carta(s) de tu deck.",
  "redesign.arena.keyword.Jamming": "Este Digimon no puede ser eliminado en batallas contra Digimon de seguridad.",
  "redesign.arena.keyword.Digisorption":
    "Cuando uno de tus Digimon digievoluciona en esta carta desde tu mano, puedes suspender 1 de tus Digimon para reducir el costo de digievolución en X.",
  "redesign.arena.keyword.Reboot": "Reactiva este Digimon durante la fase de reactivación de tu oponente.",
  "redesign.arena.keyword.DeDigivolve":
    "Descarta hasta X cartas de la parte superior de uno de los Digimon de tu oponente. Si no tiene cartas de digievolución, o se convierte en un Digimon de nivel 3, no puedes descartar más cartas.",
  "redesign.arena.keyword.Retaliation":
    "Cuando este Digimon es eliminado tras perder una batalla, elimina al Digimon contra el que combatía.",
  "redesign.arena.keyword.DigiBurst":
    "Descarta X cartas de digievolución de este Digimon para activar el efecto que sigue.",
  "redesign.arena.keyword.Rush": "Este Digimon puede atacar en el turno en que entra en juego.",
  "redesign.arena.keyword.Blitz": "Este Digimon puede atacar cuando tu oponente tiene 1 o más de memoria.",
  "redesign.arena.keyword.Delay":
    "Descarta esta carta de tu área de batalla para activar el efecto que sigue. No puedes activarlo en el turno en que esta carta entra en juego.",
  "redesign.arena.keyword.Decoy":
    "Cuando otro de tus Digimon del tipo indicado vaya a ser eliminado por un efecto del oponente, puedes eliminar este Digimon para evitar esa eliminación.",
  "redesign.arena.keyword.ArmorPurge":
    "Cuando este Digimon vaya a ser eliminado, puedes descartar la carta superior de este Digimon para evitar esa eliminación.",
  "redesign.arena.keyword.Engage": "Al final de tu turno, este Digimon puede atacar.",
  "redesign.arena.keyword.unlisted": "Impreso en esta carta. Abre la carta para leer su efecto completo.",
};
