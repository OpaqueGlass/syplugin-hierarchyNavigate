<template>
    <div>
        <template v-for="(column, index) in props.columnKeys" v-if="!hide">
            <div class="config-group" :data-group-id="column"">
                <div class="config-title">{{ props.columnNames[index] }}</div>
                <div class="config-items">
                    <slot :name="column"></slot>
                </div>
            </div>
        </template>
        <slot v-else name="none"></slot>
    </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';

const props = defineProps<{
    columnKeys: string[],
    columnNames: string[],
    hide: boolean
}>();


const currentTab = ref(props.columnKeys[0]);

</script>