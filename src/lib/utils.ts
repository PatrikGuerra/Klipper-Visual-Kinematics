export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const collect = (value: ClassValue): void => {
    if (!value) return;

    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([className, enabled]) => {
        if (enabled) classes.push(className);
      });
    }
  };

  inputs.forEach(collect);
  return classes.join(' ');
}
