import { Match, Switch } from 'solid-js';
import type { AppState } from '../kinematics/types';
import ScrewsList from './dynamicLists/ScrewsList';
import WinchesList from './dynamicLists/WinchesList';
import CarriagesList from './dynamicLists/CarriagesList';
import GenericSteppersList from './dynamicLists/GenericSteppersList';

interface DynamicListProps {
  state: AppState;
  type: 'screws' | 'winches' | 'carriages' | 'genericSteppers';
  filterText?: string;
}

export default function DynamicList(props: DynamicListProps) {
  return (
    <div class="dynamic-list">
      <Switch>
        <Match when={props.type === 'screws'}>
          <ScrewsList state={props.state} filterText={props.filterText} />
        </Match>
        <Match when={props.type === 'winches'}>
          <WinchesList state={props.state} filterText={props.filterText} />
        </Match>
        <Match when={props.type === 'carriages'}>
          <CarriagesList state={props.state} filterText={props.filterText} />
        </Match>
        <Match when={props.type === 'genericSteppers'}>
          <GenericSteppersList state={props.state} filterText={props.filterText} />
        </Match>
      </Switch>
    </div>
  );
}
