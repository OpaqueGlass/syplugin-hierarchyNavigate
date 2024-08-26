<template>
    <div class="multi-category-list" style="height: 97%; ">
        <!-- 搜索栏 -->
        <div class="b3-form__icon">
            <svg class="b3-form__icon-icon">
                <use xlink:href="#iconSearch"></use>
            </svg>
            <input type="text" class="b3-text-field fn__block b3-form__icon-input" v-model="searchQuery"
                placeholder="Search..." ref="searchInput" />
        </div>

        <!-- 类别列表 -->
        <div class="categories">
            <div v-for="(category, categoryIndex) in filteredCategories" :key="categoryIndex" class="category-column">
                <h4>{{ category.name }}</h4>
                <ul class="b3-list b3-list--background fn__flex-1" style="overflow: scroll;">
                    <li v-for="(item, rowIndex) in category.items" :key="rowIndex"
                        :class="{ 'b3-list-item--focus': isSelected(categoryIndex, rowIndex), 'b3-list-item': true }"
                        @click="onItemClick(item)">
                        <span class="b3-list-item__text">{{ item.ogSimpleName }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { debugPush, errorPush, logPush } from '@/logger';
import { getReadOnlyGSettings } from '@/manager/settingManager';
import { getAllChildDocuments, getAllSiblingDocuments, getCurrentDocSqlResult } from '@/worker/commonProvider';
import { BackLinkContentPrinter } from '@/worker/contentPrinter';
import { Dialog, openTab } from 'siyuan';
import { getPluginInstance } from '@/utils/getInstance';
import { useShowSwitchPanel } from '@/worker/pluginHelper';
const props = defineProps<{
    docId: string,
    dialog: Dialog
}>();

// 定义类别和项目的数据结构
interface Category {
    name: string;
    items: any[];
}

// 定义类别数据
const categories = ref<Category[]>([
    { name: '同级文档', items: [] },
    { name: '子文档', items: [] },
    { name: '反向链接', items: [] }
]);

// 获取数据
const __init__ = async () => {
    const currentDoc = await getCurrentDocSqlResult(props.docId);
    logPush("data", currentDoc);
    const g_setting = getReadOnlyGSettings();
    const backLinks = await BackLinkContentPrinter.getNormalBackLinks(props.docId, g_setting.sortForBackLink);
    const siblings = await getAllSiblingDocuments(currentDoc.path, currentDoc.box);
    const childrens = await getAllChildDocuments(currentDoc.path, currentDoc.box);

    categories.value[0].items = siblings.map((item) => {
        item["ogSimpleName"] = item.name.substring(0, item.name.length - 3);
        return item;
    });
    categories.value[1].items = childrens.map((item) => {
        item["ogSimpleName"] = item.name;
        return item;
    });
    categories.value[2].items = backLinks;
};

__init__().then(() => {
    logPush("分类信息", categories.value);
}).catch((err) => {
    errorPush("创建时出现错误", err);
});

// 搜索查询
const searchQuery = ref('');

// 过滤后的类别列表
const filteredCategories = computed(() => {
    return categories.value.map(category => ({
        name: category.name,
        items: category.items.filter(item =>
            item.ogSimpleName.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    })).filter(category => category.items.length > 0);
});

// 追踪选中的类别和项目
const selectedCategory = ref(0);
const selectedItem = ref(0);

// 检查是否是当前选中项
const isSelected = (categoryIndex: number, rowIndex: number): boolean => {
    return (
        selectedCategory.value === categoryIndex &&
        selectedItem.value === rowIndex
    );
};

// 点击选择项目
const selectItem = (categoryIndex: number, rowIndex: number): void => {
    selectedCategory.value = categoryIndex;
    selectedItem.value = rowIndex;
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent): void => {
    const maxCategories = filteredCategories.value.length;
    const maxItems = filteredCategories.value[selectedCategory.value]?.items.length || 0;

    switch (event.key) {
        case 'ArrowUp':
            selectedItem.value = (selectedItem.value - 1 + maxItems) % maxItems;
            event.preventDefault();
            break;
        case 'ArrowDown':
            selectedItem.value = (selectedItem.value + 1) % maxItems;
            event.preventDefault();
            break;
        case 'ArrowLeft':
            if (selectedCategory.value > 0) {
                selectedCategory.value = (selectedCategory.value - 1 + maxCategories) % maxCategories;
                selectedItem.value = 0;
            }
            event.preventDefault();
            break;
        case 'ArrowRight':
            if (selectedCategory.value < maxCategories - 1) {
                selectedCategory.value = (selectedCategory.value + 1) % maxCategories;
                selectedItem.value = 0;
            }
            event.preventDefault();
            break;
        case 'Enter':
            onItemClick(filteredCategories.value[selectedCategory.value].items[selectedItem.value]);
            event.preventDefault();
            break;
        default:
            if (!event.ctrlKey && !event.altKey && event.key.length === 1) {
                searchQuery.value += event.key;
            } else if (event.key === 'Backspace') {
                searchQuery.value = searchQuery.value.slice(0, -1);
            }
            event.preventDefault();
            break;
    }
};

// 在组件挂载时自动聚焦搜索框
onMounted(() => {
    searchInput.value?.focus();
    window.addEventListener('keydown', handleKeydown);
});
onUnmounted(() => {
    debugPush("对话框销毁");
    window.removeEventListener('keydown', handleKeydown);
})

// 搜索输入框引用
const searchInput = ref<HTMLInputElement | null>(null);

// 处理点击或Enter键
const onItemClick = (item: any): void => {
    console.log("Item clicked:", item);
    // 可以在此处添加更多逻辑来处理选中项
    openTab({
        app: getPluginInstance().app,
        doc: {
            id: item.id
        }
    });
    props.dialog.destroy();
};

</script>

<style scoped>
.multi-category-list {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

h4 {
    margin: 10px 0 5px;
}

.categories {
    display: flex;
    width: 100%;
    flex-direction: row;
    height: 100%;
}

.category-column {
    margin-right: 20px;
    width: 33%;
    /* 每列占据1/3宽度 */
    overflow: auto;
}

li {
    list-style-type: none;
    padding: 5px;
    cursor: pointer;
}

.selected {
    background-color: #42b983;
    color: white;
}

input[type="text"] {
    padding: 5px;
    font-size: 16px;
    width: 100%;
    box-sizing: border-box;
}
</style>