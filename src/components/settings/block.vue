<template>
    <div class="b3-label">
        <div class="fn__block">
            {{ props.configName }}
            <div class="b3-label__text" v-html="props.configDesp"></div>
            <div class="fn__hr"></div>
            <slot></slot>
        </div>
    </div>
</template>
<script lang="ts" setup>
/**
 * 需要给出的参数：
 * 1. 设置项Key，由组件自己去补全 name 和 desp（ settings_key_name 与 settings_key_desp ）
 */
const props = defineProps<{
    settingKey: string,
    configName: string,
    configDesp: string
}>();

</script>