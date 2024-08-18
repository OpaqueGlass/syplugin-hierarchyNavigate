<template>
    <div :class="{'config__tab-container': true, 'config__tab-container--top': hasColumn}">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
// import { ref } from 'vue';
// import { ConfigProperty } from '@/utils/settings';

const props = defineProps<{
    hasColumn?: boolean;
}>();

</script>