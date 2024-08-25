<template>
    <div class="multi-category-list">
        <!-- 搜索栏 -->
        <input type="text" v-model="searchQuery" placeholder="Search..." @keydown="handleKeydown" ref="searchInput" />

        <!-- 类别列表 -->
        <div v-for="(category, categoryIndex) in filteredCategories" :key="categoryIndex">
            <h4>{{ category.name }}</h4>
            <div class="columns">
                <div class="column" v-for="(column, colIndex) in category.columns" :key="colIndex">
                    <ul>
                        <li v-for="(item, rowIndex) in column" :key="rowIndex"
                            :class="{ selected: isSelected(categoryIndex, colIndex, rowIndex) }"
                            @click="selectItem(categoryIndex, colIndex, rowIndex)">
                            {{ item.ogSimpleName }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { errorPush, logPush } from '@/logger';
import { getReadOnlyGSettings } from '@/manager/settingManager';
import { getAllChildDocuments, getAllSiblingDocuments, getCurrentDocSqlResult } from '@/worker/commonProvider';
import { BackLinkContentPrinter } from '@/worker/contentPrinter';
import { Dialog } from 'siyuan';
import { ref, computed, onMounted } from 'vue';

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
const __init__ = async ()=>{
    const currentDoc = await getCurrentDocSqlResult(props.docId);
    logPush("data", currentDoc);
    const g_setting = getReadOnlyGSettings();
    const backLinks = await BackLinkContentPrinter.getNormalBackLinks(props.docId, g_setting.sortForBackLink);
    const siblings = await getAllSiblingDocuments(currentDoc.path, currentDoc.box);
    const childrens = await getAllChildDocuments(currentDoc.path, currentDoc.box);
    logPush("results", backLinks, siblings, childrens)
    categories.value[0].items = siblings.map((item)=>{ item["ogSimpleName"] = item.name.substring(0, item.name.length - 3); return item});
    categories.value[1].items = childrens.map((item)=>{ item["ogSimpleName"] = item.name; return item});
    categories.value[2].items = backLinks;
};

__init__().then(()=>{logPush("分类信息", categories.value)}).catch((err)=>{
    errorPush("创建时出现错误", err);
});

// 搜索查询
const searchQuery = ref('');

// 分栏数
const numColumns = ref(2); // 可以根据需要调整分栏数

// 过滤后的类别列表
const filteredCategories = computed(() => {
    return categories.value.map(category => ({
        name: category.name,
        columns: splitIntoColumns(
            category.items.filter(item =>
                item.ogSimpleName.toLowerCase().includes(searchQuery.value.toLowerCase())
            ),
            numColumns.value
        )
    })).filter(category => category.columns.length > 0);
});

// 将项目拆分成多个列
const splitIntoColumns = (items: string[], numCols: number): string[][] => {
    const result: string[][] = Array.from({ length: numCols }, () => []);
    items.forEach((item, index) => {
        result[index % numCols].push(item);
    });
    return result;
};

// 追踪选中的类别、列和项目
const selectedCategory = ref(0);
const selectedColumn = ref(0);
const selectedItem = ref(0);

// 检查是否是当前选中项
const isSelected = (categoryIndex: number, colIndex: number, rowIndex: number): boolean => {
    return (
        selectedCategory.value === categoryIndex &&
        selectedColumn.value === colIndex &&
        selectedItem.value === rowIndex
    );
};

// 点击选择项目
const selectItem = (categoryIndex: number, colIndex: number, rowIndex: number): void => {
    selectedCategory.value = categoryIndex;
    selectedColumn.value = colIndex;
    selectedItem.value = rowIndex;
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent): void => {
    const maxCategories = filteredCategories.value.length;
    const maxCols = filteredCategories.value[selectedCategory.value]?.columns.length || 0;
    const maxItems = filteredCategories.value[selectedCategory.value]?.columns[selectedColumn.value]?.length || 0;

    switch (event.key) {
        case 'ArrowUp':
            if (selectedItem.value > 0) {
                selectedItem.value = (selectedItem.value - 1 + maxItems) % maxItems;
            } else if (selectedCategory.value > 0) {
                selectedCategory.value = (selectedCategory.value - 1 + maxCategories) % maxCategories;
                selectedColumn.value = 0;
                selectedItem.value = filteredCategories.value[selectedCategory.value].columns[selectedColumn.value].length - 1;
            }
            event.preventDefault();
            break;
        case 'ArrowDown':
            if (selectedItem.value < maxItems - 1) {
                selectedItem.value = (selectedItem.value + 1) % maxItems;
            } else if (selectedCategory.value < maxCategories - 1) {
                selectedCategory.value = (selectedCategory.value + 1) % maxCategories;
                selectedColumn.value = 0;
                selectedItem.value = 0;
            }
            event.preventDefault();
            break;
        case 'ArrowLeft':
            if (selectedColumn.value > 0) {
                selectedColumn.value = (selectedColumn.value - 1 + maxCols) % maxCols;
                selectedItem.value = Math.min(selectedItem.value, filteredCategories.value[selectedCategory.value].columns[selectedColumn.value].length - 1);
            }
            event.preventDefault();
            break;
        case 'ArrowRight':
            if (selectedColumn.value < maxCols - 1) {
                selectedColumn.value = (selectedColumn.value + 1) % maxCols;
                selectedItem.value = Math.min(selectedItem.value, filteredCategories.value[selectedCategory.value].columns[selectedColumn.value].length - 1);
            }
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
});

// 搜索输入框引用
const searchInput = ref<HTMLInputElement | null>(null);

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

.columns {
    display: flex;
}

.column {
    margin-right: 20px;
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