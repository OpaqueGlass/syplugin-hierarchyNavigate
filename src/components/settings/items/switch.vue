<template>
    <input class="b3-switch fn__flex-center" type="checkbox" v-model="model"/>
</template>
<script lang="ts" setup>
import { debugPush } from '@/logger';

const model = defineModel({ type: Boolean});
</script>