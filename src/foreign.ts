// Tells apart errors from other sites' scripts, such as browser extensions. The browser hides
// their details and reports only "Script error.", so they say nothing about the game.
export function isForeignError(message: string, error: unknown): boolean {
  return error == null && /^script error\.?$/i.test(message.trim());
}
