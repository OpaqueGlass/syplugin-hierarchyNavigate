<template>
    <div style="height: 100%; display: flex; flex-direction: column;">
        <div class="multi-category-list" style="">
            <!-- 搜索栏 -->
            <div class="b3-form__icon">
                <svg class="b3-form__icon-icon">
                    <use xlink:href="#iconSearch"></use>
                </svg>
                <input type="text" class="b3-text-field fn__block b3-form__icon-input" v-model="searchQuery"
                    placeholder="Search..." ref="searchInput" />
            </div>

            <!-- 类别列表 -->
            <div class="categories" ref="categoriesContainer">
                <div v-for="(category, categoryIndex) in filteredCategories" :key="categoryIndex" class="category-column">
                    <h4>{{ category.name }}</h4>
                    <ul class="b3-list b3-list--background fn__flex-1" style="overflow: scroll;">
                        <li v-for="(item, rowIndex) in category.items" :key="rowIndex"
                            :class="{ 'b3-list-item--focus': isSelected(categoryIndex, rowIndex), 'b3-list-item': true }"
                            @click="onItemClick(item)">
                            <img class="b3-list-item__graphic" :src="'/emojis/' + item.icon"
                                v-if="item.icon?.includes('.')"></img>
                            <span class="b3-list-item__graphic" v-else>{{ item.icon != undefined ?
                                emojiIconHandler(item.icon) : "" }}</span>
                            <span class="b3-list-item__text">{{ item.ogSimpleName }}</span>
                        </li>
                    </ul>
                </div>
            </div>
            
        </div>
        <div class="search__tip" style="height: 4.5em;">
                <kbd>↑/↓/Tab/Shift+Tab</kbd> 上下左右切换所选文档
                <kbd>回车/单击</kbd> 打开 
                <kbd>Esc</kbd> 退出搜索
                <kbd>F1</kbd> 新建为同级文档
                <kbd>F2</kbd> 新建为子文档
                <kbd>F3</kbd> <span style="text-decoration: line-through;">新建为反向链接文档</span>[如有需要，请和开发者确认实现细节]
                <kbd>Ctrl+回车</kbd> 使用“基于文档搜索”插件进行全文检索
                <kbd>Shift+回车</kbd> 使用“基于文档搜索”插件进行仅标题检索
                
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
import { emojiIconHandler, htmlTransferParser } from '@/utils/onlyThisUtil';
import { sleep } from '@/utils/common';
import { createDocWithPath } from '@/syapi';
import { isValidStr } from '@/utils/commonCheck';
import { generateBlockId } from '@/syapi/custom';

const categoriesContainer = ref();

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

let currentDocInfo = null;

// 获取数据
const __init__ = async () => {
    const currentDoc = await getCurrentDocSqlResult(props.docId);
    currentDocInfo = currentDoc;
    logPush("data", currentDoc);
    const g_setting = getReadOnlyGSettings();
    const backLinks = await BackLinkContentPrinter.getNormalBackLinks(props.docId, g_setting.sortForBackLink);
    const siblings = await getAllSiblingDocuments(currentDoc.path, currentDoc.box);
    const childrens = await getAllChildDocuments(currentDoc.path, currentDoc.box);

    categories.value[0].items = siblings.map((item) => {
        item["ogSimpleName"] = htmlTransferParser(item.name.substring(0, item.name.length - 3));
        return item;
    });
    categories.value[1].items = childrens.map((item) => {
        item["ogSimpleName"] = htmlTransferParser(item.name.substring(0, item.name.length - 3));
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
// const filteredCategories = computed(() => {
//     return categories.value.map(category => ({
//         name: category.name,
//         items: category.items.filter(item =>
//             item.ogSimpleName.toLowerCase().includes(searchQuery.value.toLowerCase())
//         )
//     })).filter(category => category.items.length > 0);
// });
// 过滤后的类别列表（多个关键词匹配）
const filteredCategories = computed(() => {
    // 将 searchQuery 拆分为多个关键词（以空格分隔）
    const keywords = searchQuery.value
        .trim()
        .toLowerCase()
        .split(/\s+/);

    return categories.value.map(category => ({
        name: category.name,
        items: category.items.filter(item =>
            // 检查每个关键词是否都匹配 item 的 ogSimpleName
            keywords.every(keyword => item.ogSimpleName.toLowerCase().includes(keyword))
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
// const selectItem = (categoryIndex: number, rowIndex: number): void => {
//     selectedCategory.value = categoryIndex;
//     selectedItem.value = rowIndex;
// };

const maxItems = computed(()=>{
    return filteredCategories.value[selectedCategory.value]?.items.length || 0;
})

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent): void => {
    const maxCategories = filteredCategories.value.length;

    switch (event.key) {
        case 'ArrowUp':
            selectedItem.value = (selectedItem.value - 1 + maxItems.value) % maxItems.value;
            event.preventDefault();
            scrollIntoView();
            break;
        case 'ArrowDown':
            selectedItem.value = (selectedItem.value + 1) % maxItems.value;
            event.preventDefault();
            scrollIntoView();
            break;
        case 'ArrowLeft':
            // if (selectedCategory.value > 0) {
            //     selectedCategory.value = (selectedCategory.value - 1 + maxCategories) % maxCategories;
            //     selectedItem.value = 0;
            // }
            // event.preventDefault();
            break;
        case 'ArrowRight':
            // if (selectedCategory.value < maxCategories - 1) {
            //     selectedCategory.value = (selectedCategory.value + 1) % maxCategories;
            //     selectedItem.value = 0;
            // }
            // event.preventDefault();
            break;
        case 'Tab':
            if (event.shiftKey) {
                selectedCategory.value = (selectedCategory.value - 1 + maxCategories) % maxCategories;
                if (selectedItem.value > maxItems.value - 1 && maxItems.value > 0) {
                    selectedItem.value = maxItems.value - 1;
                }
                scrollIntoView();
                event.preventDefault();
                break;
            } else {
                selectedCategory.value = (selectedCategory.value + 1) % maxCategories;
                if (selectedItem.value > maxItems.value - 1 && maxItems.value > 0) {
                    selectedItem.value = maxItems.value - 1;
                }
                scrollIntoView();
                event.preventDefault();
                break;
            }
        case 'Enter':
            if (event.shiftKey) {
                callSypluginDocumentSearchOnlyTitle(searchQuery.value);
            } else if (event.ctrlKey) {
                callSypluginDocumentSearch(searchQuery.value);
            } else {
                onItemClick(filteredCategories.value[selectedCategory.value].items[selectedItem.value]);
            }
            event.preventDefault();
            break;
        case 'F1':
            // 新建同级文档
            if (isValidStr(searchQuery.value)) {
                event.preventDefault();
                createNeighborDocument(searchQuery.value);
            }
            break;
        case 'F2':
            // 新建子文档
            if (isValidStr(searchQuery.value)) {
                event.preventDefault();
                createChildDocument(searchQuery.value);
            }
            break;
        case 'F3':
            // 新建反向链接文档
            //xxxx
            break;
        default:
            // if (!event.ctrlKey && !event.altKey && event.key.length === 1) {
            //     searchQuery.value += event.key;
            // } else if (event.key === 'Backspace') {
            //     searchQuery.value = searchQuery.value.slice(0, -1);
            // }
            // event.preventDefault();
            break;
    }
};
// 上下移动超出显示范围调整
const scrollIntoView = () => {
    const outerContainer = categoriesContainer.value;
    let container = null;
    // danger: 这和DOM结构密切相关；由于缓存和更新延迟，不能直接使用querySelector定位
    const selectedElement = outerContainer.children[selectedCategory.value].children[1].children[selectedItem.value];
    if (selectedElement) {
        container = selectedElement.closest('.b3-list');
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        if (elementRect.top < containerRect.top) {
            container.scrollTop -= (containerRect.top - elementRect.top) + elementRect.height;
        } else if (elementRect.bottom > containerRect.bottom) {
            container.scrollTop += (elementRect.bottom - containerRect.bottom) + elementRect.height;
        }
    }
}

const callSypluginDocumentSearch = async (query: string) => {
    const panelBtn = document.querySelector(".dock__items span[data-type=syplugin-document-searchdoc_search_dock]") as HTMLElement;
    if (panelBtn != null && !panelBtn.classList.contains("dock__item--active")) {
        panelBtn.click();
        await sleep(300);
    } else if (panelBtn == null) {
        debugPush("基于文档搜索插件dock按钮不存在");
        return;
    }
    const searchInput = document.getElementById("documentSearchInput") as HTMLInputElement;
    if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input'));
    } else {
        debugPush("input不存在");
    }
    props.dialog.destroy();
};

const callSypluginDocumentSearchOnlyTitle = async (query: string) => {
    const panelBtn = document.querySelector(".dock__items span[data-type=syplugin-document-searchflat_doc_tree_dock]") as HTMLElement;
    if (panelBtn != null && !panelBtn.classList.contains("dock__item--active")) {
        await sleep(300);
        panelBtn.click();
    } else if (panelBtn == null) {
        debugPush("基于文档搜索插件dock按钮不存在");
        return;
    }
    const searchInput = document.querySelector(".layout__tab--active.sy__syplugin-document-searchflat_doc_tree_dock[data-id] .search__header input") as HTMLInputElement;
    if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input'));
    } else {
        debugPush("input不存在");
    }
    props.dialog.destroy();
};

const createNeighborDocument = async (title: string) => {
    const currentDoc = currentDocInfo;
    if (currentDoc == null) {
        errorPush("当前文档信息为空");
        return;
    }
    const blockId = generateBlockId();
    const path = currentDoc.path.split('/').slice(0, -1).join('/') + '/' + blockId + '.sy';
    debugger
    await createDocWithPath(currentDoc.box, path, title);
    openDocAndCloseById(blockId);
}

const createChildDocument = async (title: string) => {
    const currentDoc = currentDocInfo;
    if (currentDoc == null) {
        errorPush("当前文档信息为空");
        return;
    }
    const blockId = generateBlockId();
    const path = currentDoc.path.substring(0, currentDoc.path.length - 3) + '/' + blockId + '.sy';
    debugger
    await createDocWithPath(currentDoc.box, path, title);
    openDocAndCloseById(blockId);
}

// 在组件挂载时自动聚焦搜索框
onMounted(() => {
    searchInput.value?.focus();
    window.addEventListener('keydown', handleKeydown, true);
});
onUnmounted(() => {
    debugPush("对话框销毁");
    window.removeEventListener('keydown', handleKeydown, true);
})

// 搜索输入框引用
const searchInput = ref<HTMLInputElement | null>(null);

// 处理点击或Enter键
const onItemClick = (item: any): void => {
    console.log("Item clicked:", item);
    // 可以在此处添加更多逻辑来处理选中项
    openDocAndCloseById(item.id);
};

const openDocAndCloseById = (docId: string) => {
    openTab({
        app: getPluginInstance().app,
        doc: {
            id: docId
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
    flex-grow: 1; 
    overflow: hidden;
}

h4 {
    margin: 10px 0 5px;
}

.categories {
    display: flex;
    width: 100%;
    flex-direction: row;
    height: 100%;
    overflow: hidden;
}

.category-column {
    margin-right: 20px;
    /* width: 33%; */
    flex-shrink: 1;
    /* 每列占据1/3宽度 */
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

li {
    list-style-type: none;
    /*padding: 5px;*/
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