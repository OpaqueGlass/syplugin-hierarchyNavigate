export default class ContentApplyer {
    private basicInfo;
    private protyleEnvInfo;
    private protyleElement;
    constructor(basicInfo, protyleEnvInfo, protyleElement: HTMLElement) {
        this.basicInfo = basicInfo;
        this.protyleEnvInfo = protyleEnvInfo;
        this.protyleElement = protyleElement;
    }
    async apply(finalElement: HTMLElement) {
        // 应用内容
        
    }
}