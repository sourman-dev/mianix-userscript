import type { AccordionPanelProps } from '../types';
interface UseAccordionClassesProps {
    isVisible: boolean;
    props: AccordionPanelProps;
}
declare const useAccordionPanelClasses: ({ props, isVisible }: UseAccordionClassesProps) => string;
export { useAccordionPanelClasses, };
