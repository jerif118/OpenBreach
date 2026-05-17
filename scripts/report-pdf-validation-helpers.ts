export function requiredElement<T>(
  values: readonly T[],
  index: number,
  message: string,
): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function requiredMatchGroup(
  match: RegExpMatchArray,
  groupIndex: number,
  description: string,
): string {
  const group = match[groupIndex];

  if (group === undefined) {
    throw new Error(`${description} is missing an expected capture group.`);
  }

  return group;
}
