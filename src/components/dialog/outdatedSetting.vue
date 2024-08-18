<template>
    <div style="word-break: normal;">
        <p>
            {{ lang("dialog_panel_outdate_content1")}}
        </p>
        <ul style="margin: 10px 0px;list-style-position: inside;">
            <li v-for="(name, index) in outdatedNames">
                    {{ name }} [{{ lang("default") }}: {{ defaultSettings[outdatedKeys[index]] }}]
            </li>
        </ul>
        <p>
            {{ lang("dialog_panel_outdate_content2")}}
        </p>
    </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { lang } from '@/utils/lang';

const props = defineProps<{
    outdatedKeys: string[],
    defaultSettings: Record<string, any>
}>();
const outdatedNames = ref<string[]>([]);
props.outdatedKeys.forEach(key => {
    outdatedNames.value.push(lang(`setting_${key}_name`));
});
</script>