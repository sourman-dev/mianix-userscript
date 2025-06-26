import { type Ref } from 'vue';
import type { AccordionContentProps, AccordionPanel, AccordionState } from '../types';
export declare const useAccordionContentClasses: (accordionState: Ref<AccordionState | undefined>, panelState: Ref<AccordionPanel | null>, props: AccordionContentProps) => string;
