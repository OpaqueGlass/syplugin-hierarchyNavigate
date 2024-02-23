<template>
    <div class="fn__flex-1 fn__flex config__panel" style="width: auto; height: 100%; max-width: 1280px;">
        <ul class="b3-tab-bar b3-list b3-list--background">
            <!-- 这里可以插入设置项目，但是似乎没有必要 -->
            <li v-for="(tab, index) in tabList" :key="index"
                :class="{ 'b3-list-item--focus': activeTab === tab.key, 'b3-list-item': true }" @click="changeTab(tab.key)">
                <svg class="b3-list-item__graphic">
                    <use xlink:href="#{{ tab.iconKey }}"></use>
                </svg>
                <!-- 这里是svg图标 -->
                <span class="b3-list-item__text">{{ settingPageLang(tab.key)[0] }}</span>
            </li>
        </ul>
        <div class="config__tab-wrap">
            <!-- TODO: 这里换成v-for根据列表生成，不再手动填充了 -->
            <!-- 在Page上通过当前显示的标签页名称key一致匹配确定是否显示这个标签页 -->
            <Page v-for="(tab, index) in tabList" v-show="activeTab === tab.key">
                <template v-for="(item, index) in tab.props">
                    <template v-if="['TEXTAREA', 'CUSTOM', 'ORDER', 'TIPS'].indexOf(item.type) == -1">
                        <Item :key="index" :setting-key="item.key"  :config-name="item.configName" :config-desp="item.description">
                            <template v-if="item.type == 'SWITCH'">
                                <Switch v-model="g_setting[item.key]"></Switch>
                            </template>
                            <template v-else-if="item.type == 'SELECT'">
                                <Select :option-names="item.optionNames" :option-keys="item.options"
                                    v-model="g_setting[item.key]"></Select>
                            </template>
                            <template v-else-if="item.type == 'NUMBER'">
                                <Input :min="item.min" :max="item.max" :type="item.type"
                                    v-model="g_setting[item.key]"></Input>
                            </template>
                            <template v-else-if="item.type == 'TEXT'">
                                <Input :min="item.min" :max="item.max" :type="item.type"
                                    v-model="g_setting[item.key]"></Input>
                            </template>
                            <template v-else-if="item.type == 'BUTTON'">
                                <Button :btn-name="settingLang(item.key)[2]" :btndo="item.btndo"></Button>
                            </template>
                            
                            <template v-else>
                                出错啦，不能载入设置项，请检查设置代码实现。 Key: {{ item.key }}
                                <br />
                                Oops, can't load settings, check code please. Key: {{ item.key }}
                            </template>
                        </Item>
                    </template>
                    <template v-else>
                        <Block :setting-key="item.key">
                            <template v-if="item.type == 'TEXTAREA'">
                                <Textarea v-model="g_setting[item.key]"></Textarea>
                            </template>
                            <template v-else-if="item.type == 'ORDER'">
                                <Order :option-names="item.optionNames" :option-desps="item.optionDesps" :option-keys="item.options"
                                    :setting-key="item.key" v-model="g_setting[item.key]"></Order>
                            </template>
                        </Block>
                    </template>
                </template>

                
            </Page>
        </div>
    </div>
</template>
  
<script lang="ts" setup>
import { ref } from 'vue';
import { settingLang, settingPageLang } from '@/utils/lang';
import Page from './page.vue';
import Block from "./block.vue";
import Item from './item.vue';
import Button from './items/button.vue';
import Switch from './items/switch.vue';
import Input from './items/input.vue';
import Select from './items/select.vue';
import Textarea from './items/textarea.vue';
import Order from './items/order.vue';
import { getGSettings, getTabProperties } from '@/manager/settingManager';
import { logPush } from '@/logger';

// const props = defineProps<{
//     tabs: Array<ITabProperty>
// }>();

const g_setting = getGSettings();

const tabList = getTabProperties();

const activeTab = ref(tabList[0].key);
// 这里或许应该动态创建tabs组件实例（动态创建tabPage）

// tab需要有个列表，然后watch activeTab的变化，切换到对应的组件

function changeTab(key: string) {
    activeTab.value = key;
}
</script>
  
<style>
.tab-menu {
    list-style: none;
    padding: 0;
    margin: 0;
}

.tab-menu li {
    display: inline-block;
    margin-right: 10px;
    cursor: pointer;
}

.tab-menu li.active {
    font-weight: bold;
}</style>