<template>
    <button class="b3-button b3-button--outline fn__size200" @click="props.btndo">{{ props.btnName }}</button>
</template>
<script lang="ts" setup>
// import { ref } from 'vue';
const props = defineProps<{
    btnName: string,
    btndo: () => void
}>();
// 如果传入btndo不行的话，需要考虑子组件 $emit发送事件

// 总体来说，这类的设置项需要完成：
// 1. 读入设置项，并将其显示到对应位置
// 2. 感知变化，并将变化通过 settingManager的API保存
</script>