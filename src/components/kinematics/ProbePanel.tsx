import type { FieldLayoutGroup } from '../../kinematics/fieldLayouts';
import type { AppState, Diagnostic, FieldDefinition, KinematicDefinition } from '../../kinematics/types';
import { setValue } from '../../store';
import FieldGroup from '../FieldGroup';
import SectionToggleTitle from './SectionToggleTitle';

interface ProbePanelProps {
  state: AppState;
  diagnostics: Diagnostic[];
  kin: KinematicDefinition;
  fields: FieldDefinition[];
  layout: FieldLayoutGroup[];
}

export default function ProbePanel(props: ProbePanelProps) {
  const tooltip = () =>
    props.kin.supportsProbeFeatures
      ? 'Enable [probe], [safe_z_home], and [bed_mesh] sections when generating printer.cfg.'
      : 'Probe, mesh, and safe Z home sections are not supported for the selected kinematics.';

  return (
    <section class="panel">
      <SectionToggleTitle
        id="enable-probe-section"
        label="Probe & Mesh"
        checked={!!props.state.values.probeFeaturesEnabled}
        disabled={!props.kin.supportsProbeFeatures}
        tooltip={tooltip()}
        onChange={(checked) => setValue('probeFeaturesEnabled', checked)}
      />
      <div classList={{ 'disabled-block': !props.kin.supportsProbeFeatures || !props.state.values.probeFeaturesEnabled }}>
        <FieldGroup fields={props.fields} state={props.state} diagnostics={props.diagnostics} layout={props.layout} emptyMessage="No matching config fields in this block." />
      </div>
    </section>
  );
}
