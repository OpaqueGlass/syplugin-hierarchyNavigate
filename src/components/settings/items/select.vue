<template>
    <select class="b3-select fn__flex-center fn__size200" v-model="model" > <!--@change="updateSingleSetting.bind(key)"-->
        <option v-for="(item, index) in props.optionNames" :value="index">{{ item }}</option>
    </select>
</template>
<script lang="ts" setup>
// import { ref } from 'vue';
// import { updateSingleSetting } from '@/manager/settingManager'
const props = defineProps<{
    optionNames: Array<string>
}>();
// 获取optionNames
const model = defineModel({ type: Number})
</script>