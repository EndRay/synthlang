export const THROTTLE_INTERVAL = 16; // milliseconds

export const camelCaseToTitle = (str: string) => {
  // filterEnv => filter env (notice how all letters are lowercase)
  return str.replace(/([A-Z])/g, ' $1').toLowerCase();
}
