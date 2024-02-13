<template>
    <input class="b3-text-field fn__flex-center fn__size200" :type="inputElemType" :min="props.min" :max="props.max" v-model="model" />
</template>
<script lang="ts" setup>
import { ref } from 'vue';
/**
 * 需要给出的参数：
 * 1. 设置项Key，由组件自己去补全 name 和 desp（ settings_key_name 与 settings_key_desp ）
 * emm倒是相比主动调，不如ref一下然后onComputed、watch什么的自动更新
 */
const props = defineProps<{
    type: "NUMBER" | "TEXT",
    min?: number,
    max?: number
}>();

const model = defineModel();

let inputElemType = ref("text");
switch (props.type) {
    case "NUMBER":
        inputElemType.value = "number";
        break;
    case "TEXT":
        inputElemType.value = "text";
        break;
    default:
        inputElemType.value = "text";
        break;
}

</script>