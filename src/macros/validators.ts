import { simulateMacro } from './simulator';
import type { AppState, Diagnostic, MacroDefinition } from '../kinematics/types';

export function validateMacros(state: AppState): Diagnostic[] {
  const items: Diagnostic[] = [];
  const names = new Map<string, number>();
  state.macros.forEach((macro) => {
    const normalized = macro.name.trim().toUpperCase();
    names.set(normalized, (names.get(normalized) ?? 0) + 1);
    validateMacroBasics(macro, items);
  });
  names.forEach((count, name) => {
    if (name && count > 1) error(items, `Macro name "${name}" is duplicated.`, 'macro');
  });

  const active = state.macros.find((macro) => macro.id === state.activeMacroId);
  if (active) items.push(...simulateMacro(active, state).diagnostics);
  return items;
}

function validateMacroBasics(macro: MacroDefinition, items: Diagnostic[]): void {
  const name = macro.name.trim();
  if (!name) error(items, 'Macro name is required.', 'macro');
  if (name && !/^[A-Za-z_]+[0-9]*$/.test(name)) {
    error(items, `Macro "${name}" has an invalid Klipper macro name. Use letters/underscore, with numbers only at the end.`, 'macro');
  }
  if (macro.enabled && !macro.gcode.trim()) error(items, `Macro "${name || 'unnamed'}" is enabled but has empty gcode.`, 'macro');
}

function error(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'error', message, field });
}

