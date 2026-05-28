import { For, Show } from 'solid-js';
import { setValue } from '../store';
import type { AppState, Diagnostic, FieldDefinition } from '../kinematics/types';
import type { FieldLayoutCell, FieldLayoutGroup, FieldLayoutRow, FieldLayoutVariant } from '../kinematics/fieldLayouts';

interface FieldGroupProps {
  fields: FieldDefinition[];
  state: AppState;
  diagnostics: Diagnostic[];
  emptyMessage?: string;
  layout?: FieldLayoutGroup[];
}

interface VisibleAxisCell extends FieldLayoutCell {
  field: FieldDefinition;
}

interface VisibleLayoutRow {
  title?: string;
  cells: VisibleAxisCell[];
}

interface VisibleLayoutGroup {
  title: string;
  variant: FieldLayoutVariant;
  fields: FieldDefinition[];
  rows: VisibleLayoutRow[];
}

export default function FieldGroup(props: FieldGroupProps) {
  const emptyMessage = () => props.emptyMessage ?? 'No extra fields for this kinematic.';
  const fieldMap = () => new Map(props.fields.map((field) => [field.id, field]));
  const groupedIds = () => new Set((props.layout ?? []).flatMap(layoutIds));
  const grouped = () =>
    (props.layout ?? [])
      .map((group): VisibleLayoutGroup => {
        const variant = group.variant ?? 'cluster';
        const rows = visibleRows(group);
        const fields = layoutIds(group).map((id) => fieldMap().get(id)).filter((field): field is FieldDefinition => !!field);
        return { title: group.title, variant, fields, rows };
      })
      .filter((group) => group.fields.length > 0 || group.rows.length > 0);
  const ungrouped = () => props.fields.filter((field) => !groupedIds().has(field.id));

  function layoutIds(group: FieldLayoutGroup): string[] {
    return group.ids ?? group.rows?.flatMap((row) => row.cells.map((cell) => cell.id)) ?? [];
  }

  function visibleRows(group: FieldLayoutGroup): VisibleLayoutRow[] {
    const rows: FieldLayoutRow[] = group.rows ?? [{ cells: layoutIds(group).map((id) => ({ id })) }];
    return rows
      .map((row) => ({
        title: row.title,
        cells: row.cells
          .map((cell) => {
            const field = fieldMap().get(cell.id);
            return field ? { ...cell, field } : undefined;
          })
          .filter((cell): cell is VisibleAxisCell => !!cell)
      }))
      .filter((row) => row.cells.length > 0);
  }

  function fieldClass(id: string): string {
    const issues = props.diagnostics.filter((diagnostic) => diagnostic.field === id);
    if (issues.some((diagnostic) => diagnostic.type === 'error')) return 'field-error';
    if (issues.some((diagnostic) => diagnostic.type === 'warning')) return 'field-warning';
    return '';
  }

  function titleFor(id: string): string {
    return props.diagnostics
      .filter((diagnostic) => diagnostic.field === id)
      .map((diagnostic) => diagnostic.message)
      .join('\n');
  }

  function inputValue(field: FieldDefinition): string | number {
    const value = props.state.values[field.id];
    return typeof value === 'boolean' ? String(value) : value ?? '';
  }

  function renderField(field: FieldDefinition) {
    return (
      <div classList={{ full: !!field.full }} class="field">
        <label for={`field_${field.id}`}>{field.label}</label>
        <input
          id={`field_${field.id}`}
          class={fieldClass(field.id)}
          title={titleFor(field.id)}
          type={field.type}
          step={field.step}
          value={inputValue(field)}
          onInput={(event) => setValue(field.id, event.currentTarget.value)}
        />
      </div>
    );
  }

  function renderAxisInput(cell: VisibleAxisCell) {
    const inputId = `field_${cell.field.id}`;

    return (
      <label class="axis-input" title={titleFor(cell.field.id)} for={inputId}>
        <span class="axis-prefix">{cell.prefix ?? cell.field.label}</span>
        <input
          id={inputId}
          class={fieldClass(cell.field.id)}
          type={cell.field.type}
          step={cell.field.step}
          value={inputValue(cell.field)}
          aria-label={cell.field.label}
          onInput={(event) => setValue(cell.field.id, event.currentTarget.value)}
        />
      </label>
    );
  }

  function renderLayoutGroup(group: VisibleLayoutGroup) {
    if (group.variant === 'axis-row') {
      return (
        <div class="axis-group">
          <div class="axis-group-title">{group.title}</div>
          <div class="axis-row">
            <For each={group.rows.flatMap((row) => row.cells)}>{(cell) => renderAxisInput(cell)}</For>
          </div>
        </div>
      );
    }

    if (group.variant === 'axis-matrix') {
      return (
        <div class="axis-group axis-matrix">
          <div class="axis-group-title">{group.title}</div>
          <div class="axis-matrix-rows">
            <For each={group.rows}>
              {(row) => (
                <div class="axis-matrix-row">
                  <span class="axis-row-title">{row.title}</span>
                  <div class="axis-row">
                    <For each={row.cells}>{(cell) => renderAxisInput(cell)}</For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      );
    }

    return (
      <div class="field-cluster">
        <div class="field-cluster-title">{group.title}</div>
        <div classList={{ 'field-grid': true, 'field-grid-three': group.fields.length >= 3 }}>
          <For each={group.fields}>{(field) => renderField(field)}</For>
        </div>
      </div>
    );
  }

  return (
    <Show when={props.fields.length > 0} fallback={<p class="help">{emptyMessage()}</p>}>
      <div class="field-group-stack">
        <For each={grouped()}>{(group) => renderLayoutGroup(group)}</For>
        <Show when={ungrouped().length > 0}>
          <div class="field-grid">
            <For each={ungrouped()}>{(field) => renderField(field)}</For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
