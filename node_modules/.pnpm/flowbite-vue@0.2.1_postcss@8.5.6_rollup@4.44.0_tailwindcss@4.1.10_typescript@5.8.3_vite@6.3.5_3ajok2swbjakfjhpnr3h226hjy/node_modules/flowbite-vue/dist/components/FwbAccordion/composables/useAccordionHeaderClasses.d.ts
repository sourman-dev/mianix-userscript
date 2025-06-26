import { type Ref } from 'vue';
import type { AccordionHeaderProps, AccordionPanel, AccordionState } from '../types';
interface AccordionHeaderClasses {
    arrowClasses: string;
    headerClasses: string;
}
export declare const useAccordionHeaderClasses: (accordionState: Ref<AccordionState | undefined>, panelState: Ref<AccordionPanel | null>, props: AccordionHeaderProps) => AccordionHeaderClasses;
export {};
