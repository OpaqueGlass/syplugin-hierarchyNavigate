
export function saveMenuInstance(menu) {
    if (!window["OGTempHN"]) {
        window["OGTempHN"] = {};
    }
    window["OGTempHN"]["recentMenu"] = menu;
}

export function clearMenuInstance() {
    if (!window["OGTempHN"]) {
        window["OGTempHN"] = {};
    }
    if (window["OGTempHN"]["recentMenu"]) {
        window["OGTempHN"]["recentMenu"].close();
        window["OGTempHN"]["recentMenu"] = null;
    }
}