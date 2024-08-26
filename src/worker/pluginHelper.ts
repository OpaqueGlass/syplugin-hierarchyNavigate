import { Dialog } from "siyuan";
import { Ref, ref } from "vue";

let showSwitchPanelDialog: Ref<Dialog|null> = ref(null);

export function useShowSwitchPanel() {
    return showSwitchPanelDialog;
}