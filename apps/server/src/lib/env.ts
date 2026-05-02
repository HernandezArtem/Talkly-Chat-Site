export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value != null && value !== "") return value;
  return undefined;
}
