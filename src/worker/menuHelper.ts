
export function saveMenuInstance(menu, id) {
    testTempStorage();
    window["OGTempHN"]["recentMenu"] = {
        "menu": menu,
        "id": id
    };
}

export function testTempStorage() {
    if (!window["OGTempHN"]) {
        window["OGTempHN"] = {};
        return false;
    }
    return true;
}

export function setTop(topElement) {
    testTempStorage();
    window["OGTempHN"]["topElement"] = topElement;
}
export function getTop() {
    if (testTempStorage()) {
        return window["OGTempHN"]["topElement"];
    }
    return null;
}
export function removeTop() {
    testTempStorage();
    window["OGTempHN"]["topElement"] = null;
}

export function clearMenuInstance(id) {
    if (!testTempStorage()) {
        return false;
    }
    if (window["OGTempHN"]["recentMenu"]) {
        let tempId = window["OGTempHN"]["recentMenu"]["id"];
        // menu.isOpen没啥用，菜单显示时isOpen也不是true
        // 存在相同的菜单，仅关闭，不重新打开
        if (tempId === id && document.querySelector("#commonMenu[data-name='og-hn-relative-menu']")) {
            window["OGTempHN"]["recentMenu"]["menu"]?.close();
            window["OGTempHN"]["recentMenu"] = null;
            return true;
        }
        window["OGTempHN"]["recentMenu"]["menu"]?.close();
        window["OGTempHN"]["recentMenu"] = null;
    }
    return false;
}