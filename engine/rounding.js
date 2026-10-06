/** The game uses integer weapon attack after Echo for an actual WA stack. */
export function applyEchoWa(preEchoWa, multiplier) {
  // Hero's Enrage uptime fixture is a time average, not an equipable WA value.
  // Keep that approximation continuous until the individual states are modeled.
  return Number.isInteger(preEchoWa)
    ? Math.floor(preEchoWa * multiplier)
    : preEchoWa * multiplier;
}
