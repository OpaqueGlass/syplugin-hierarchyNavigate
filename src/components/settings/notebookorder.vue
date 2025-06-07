<template>
  <div>
    <!-- 选择笔记本 -->
    <Item settingKey="" :configName="lang('setting_selectOneNotebookFirst_name')" :configDesp="lang('setting_selectOneNotebookFirst_desp')">
      <select class="b3-select fn__flex-center fn__size200" v-model="currentNotebookId">
        <option disabled value="">{{ lang("please_select") }}</option>
        <option v-for="item in notebookList" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </Item>

    <!-- 文档开头排序设置 -->
    <Item settingKey="" :configName="lang('setting_notebookTopAreaEnable_name')" :configDesp="lang('setting_notebookTopAreaEnable_desp')">
      <button class="b3-button b3-button--outline fn__flex-center fn__size200"
        @click="topForNotebook"
        :disabled="!currentNotebookObj"
      >{{ lang("enable_or_disable") }}</button>
      
    </Item>
    <Block 
        v-if="currentNotebookId && isTopEnabled"
        :setting-key="currentNotebookObj.configTopKeyName"
        :config-name="notebookName(currentNotebookId) + lang('setting_notebookTopArea_index_name')"
        :config-desp="lang('setting_notebookTopArea_index_desp')"
      >
        <Order
          :option-names="optionNames"
          :option-desps="optionDesps"
          :option-keys="generalOptions"
          v-model="g_setting[currentNotebookObj.configTopKeyName]"
          :setting-key="currentNotebookObj.configTopKeyName"
        />
    </Block>

    <!-- 文档末尾排序设置 -->
    <Item settingKey="" :configName="lang('setting_notebookEndAreaEnable_name')" :configDesp="lang('setting_notebookEndAreaEnable_desp')">
      <button class="b3-button b3-button--outline fn__flex-center fn__size200"
        @click="bottomForNotebook"
        :disabled="!currentNotebookObj"
      >启用/禁用</button>
    </Item>
    <Block 
        v-if="currentNotebookId && isBottomEnabled"
        :setting-key="currentNotebookObj.configEndKeyName"
        :config-name="notebookName(currentNotebookId) + lang('setting_notebookEndArea_index_name')"
        :config-desp="lang('setting_notebookEndArea_index_desp')"
      >
        <Order
          :option-names="optionNames"
          :option-desps="optionDesps"
          :option-keys="generalOptions"
          v-model="g_setting[currentNotebookObj.configEndKeyName]"
          :setting-key="currentNotebookObj.configEndKeyName"
        />
      </Block>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import Item from './item.vue'
import Block from './block.vue'
import Order from './items/order.vue'
import { PRINTER_NAME } from '@/constants'
import { getGSettings } from '@/manager/settingManager'
import { logPush } from '@/logger'
import { lang } from '@/utils/lang'

const notebookList = ref(window.siyuan.notebooks.map(n => ({
  id: n.id,
  name: n.name,
  configTopKeyName: "setting_notebook_order_top_" + n.id,
  configEndKeyName: "setting_notebook_order_end_" + n.id,
})))

const generalOptions = [
  PRINTER_NAME.PARENT, PRINTER_NAME.CHILD, PRINTER_NAME.SIBLING,
  PRINTER_NAME.PREV_NEXT, PRINTER_NAME.BACKLINK, PRINTER_NAME.BREADCRUMB,
  PRINTER_NAME.INFO, PRINTER_NAME.WIDGET, PRINTER_NAME.ON_THIS_DAY,
  PRINTER_NAME.FORWARDLINK, PRINTER_NAME.PREV_NEXT_PREVIEW,
  PRINTER_NAME.PREVIEW_BOX
]

const optionNames = generalOptions.map(item=>lang("setting_openDocContentGroup_option_" + item))
const optionDesps = generalOptions.map(item=>"")

const currentNotebookId = ref('')

const currentNotebookObj = computed(() => {
  return notebookList.value.find(n => n.id === currentNotebookId.value)
})

// 全局设置对象
const g_setting = getGSettings()

const isTopEnabled = computed(() =>
  currentNotebookObj.value && g_setting.value[currentNotebookObj.value.configTopKeyName] !== null && g_setting.value[currentNotebookObj.value.configTopKeyName] !== undefined
)

const isBottomEnabled = computed(() =>
  currentNotebookObj.value && g_setting.value[currentNotebookObj.value.configEndKeyName] !== null && g_setting.value[currentNotebookObj.value.configEndKeyName] !== undefined
)

function topForNotebook() {
    if (!currentNotebookObj.value) return;
    if (isTopEnabled.value) {
        g_setting.value[currentNotebookObj.value.configTopKeyName] = null;
    } else {
        g_setting.value[currentNotebookObj.value.configTopKeyName] = [];
    }
}

function bottomForNotebook() {
    if (!currentNotebookObj.value) return;
    if (isBottomEnabled.value) {
        g_setting.value[currentNotebookObj.value.configEndKeyName] = null;
    } else {
        g_setting.value[currentNotebookObj.value.configEndKeyName] = [];
    }
}

function notebookName(id: string) {
  const n = notebookList.value.find(n => n.id === id)
  return n ? n.name : id
}
</script>