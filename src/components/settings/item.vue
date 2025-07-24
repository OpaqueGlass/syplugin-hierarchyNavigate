<template>
    <div class="fn__flex b3-label config__item">
        <div class="fn__flex-1 fn__flex-center">{{ props.configName }}
            <div class="b3-label__text" v-html="htmlContent"></div>
        </div>
        <div class="fn__space"></div>
        <!-- 这里是实际的表单元素 -->
        <slot />
    </div>
</template>
<script lang="ts" setup>
import {lang} from '@/utils/lang'
import { computed } from 'vue';
/**
 * 需要给出的参数：
 * 1. 设置项Key，由组件自己去补全 name 和 desp（ settings_key_name 与 settings_key_desp ）
 */
const props = defineProps<{
    settingKey: string,
    configName: string,
    configDesp: string,
    applyValue: string,
    defaultValue: string,
}>();

const htmlContent = computed(()=>{
    if (props.defaultValue != props.applyValue) {
        return props.configDesp + lang("option_modified");
    } else {
        return props.configDesp;
    }
});

// const settingLangs = settingLang(props.settingKey);

</script>