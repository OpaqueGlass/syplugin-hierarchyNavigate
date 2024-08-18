<template>
    <div class="fn__flex-column" style="height: 100%;" v-if="!hide">
        <div class="layout-tab-bar fn__flex">
            <template v-for="(column, index) in props.columnKeys">
                <div class="item item--full" :class="{'item--focus': currentTab === column}" :data-type="column" @click="changeTab(column)">
                    <span class="fn__flex-1"></span>
                    <span>{{ props.columnNames[index] }}</span>
                    <span class="fn__flex-1"></span>
                </div>
            </template>
        </div>
        <div class="fn__flex-1">
            <div v-for="(column, index) in props.columnKeys" :data-type="column" :class="{'fn__none': currentTab !== column}">
                <slot :name="column"></slot>
            </div>
        </div>  
    </div>
    <slot v-else name="none"></slot>
</template>
<script lang="ts" setup>
import { ref } from 'vue';

const props = defineProps<{
    columnKeys: string[],
    columnNames: string[],
    hide: boolean
}>();

const changeTab = (newColumn)=>{
    currentTab.value = newColumn;
}

const currentTab = ref(props.columnKeys[0]);

</script>