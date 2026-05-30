import { createEffect, onCleanup, onMount } from 'solid-js';
import { minimalSetup } from 'codemirror';
import { autocompletion } from '@codemirror/autocomplete';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { createGcodeCompletionSource, knownGcodeCommandLabels } from './gcodeCompletions';

interface GcodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  macroNames?: string[];
  id?: string;
  ariaLabel?: string;
}

const commandPattern = new RegExp(`(?:${knownGcodeCommandLabels.map(escapeRegExp).join('|')})\\b`, 'i');
const genericCommandPattern = /(?:[GMT]\d+|[A-Z_][A-Z0-9_]*)(?=\s|$)/i;
const parameterPattern = /[XYZEFSPRIJABCUVW]/i;
const numberPattern = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)/;

const gcodeLanguage = StreamLanguage.define({
  name: 'gcode',
  token(stream) {
    if (stream.eatSpace()) return null;

    const next = stream.peek();
    if (next === ';' || next === '#') {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.match(/\{[%#]?/)) {
      while (!stream.eol()) {
        if (stream.next() === '}') break;
      }
      return 'invalid';
    }

    if (stream.match(commandPattern)) return 'keyword';
    if (stream.match(parameterPattern)) return 'propertyName';
    if (stream.match(numberPattern)) return 'number';
    if (stream.match(/=/)) return 'operator';
    if (stream.match(genericCommandPattern)) return 'variableName';

    stream.next();
    return null;
  }
});

const gcodeHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#1d4ed8', fontWeight: '700' },
  { tag: tags.propertyName, color: '#047857', fontWeight: '700' },
  { tag: tags.number, color: '#b45309' },
  { tag: tags.variableName, color: '#475569' },
  { tag: tags.operator, color: '#64748b' },
  { tag: tags.comment, color: '#7c8798', fontStyle: 'italic' },
  { tag: tags.invalid, color: '#b91c1c', backgroundColor: '#fff1f2' }
]);

export default function GcodeEditor(props: GcodeEditorProps) {
  let host!: HTMLDivElement;
  let view: EditorView | undefined;
  const autocompleteCompartment = new Compartment();
  const autocompleteExtension = () => autocompletion({
    override: [createGcodeCompletionSource({ macroNames: props.macroNames ?? [] })],
    closeOnBlur: true
  });

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: props.value,
        extensions: [
          minimalSetup,
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          gcodeLanguage,
          syntaxHighlighting(gcodeHighlight),
          autocompleteCompartment.of(autocompleteExtension()),
          EditorState.tabSize.of(2),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            props.onChange(update.state.doc.toString());
          })
        ]
      })
    });
  });

  createEffect(() => {
    if (!view) return;
    props.macroNames?.join('\n');
    view.dispatch({
      effects: autocompleteCompartment.reconfigure(autocompleteExtension())
    });
  });

  createEffect(() => {
    if (!view) return;
    const next = props.value;
    const current = view.state.doc.toString();
    if (next === current) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next }
    });
  });

  onCleanup(() => {
    view?.destroy();
    view = undefined;
  });

  return <div id={props.id} ref={host} class="gcode-codemirror" role="textbox" aria-label={props.ariaLabel ?? 'G-code editor'} />;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
