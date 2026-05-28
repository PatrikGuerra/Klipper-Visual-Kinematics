import type { MacroDefinition } from '../kinematics/types';

export function generateMacrosConfig(macros: MacroDefinition[]): string {
  return macros
    .filter((macro) => macro.enabled)
    .map(generateMacroConfig)
    .filter(Boolean)
    .join('\n\n');
}

export function generateMacroConfig(macro: MacroDefinition): string {
  const name = normalizeMacroName(macro.name);
  const description = macro.description.trim();
  const body = normalizeGcodeIndent(macro.gcode);
  const lines = [`[gcode_macro ${name}]`];
  if (description) lines.push(`description: ${description}`);
  if (macro.paramsText.trim()) {
    macro.paramsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => lines.push(line));
  }
  lines.push('gcode:', body || '  # Add commands here');
  return lines.join('\n');
}

export function normalizeMacroName(name: string): string {
  return name.trim().replace(/\s+/g, '_').toUpperCase() || 'CUSTOM_MACRO';
}

export function normalizeGcodeIndent(gcode: string): string {
  return gcode
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.trim() ? `  ${line.replace(/^\s+/, '')}` : ''))
    .join('\n');
}

