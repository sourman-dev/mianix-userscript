import { type Ref } from 'vue';
import type { FlowbiteTheme, ThemableChildrenApply } from '../types';
type UseFlowbiteThemableChildReturns = {
    classes: Ref<string>;
};
type UseFlowbiteThemableChildProps = {
    apply: Ref<ThemableChildrenApply[]>;
    theme?: Ref<FlowbiteTheme | undefined>;
};
export declare function useFlowbiteThemableChildClasses(props: UseFlowbiteThemableChildProps): UseFlowbiteThemableChildReturns;
export {};
