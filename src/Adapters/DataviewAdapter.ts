import { debugLog } from "Utils/Utils";

/**
 * Currently experimental adapter to try to integrate Dataview.
 */
export default class DataviewAdapter {

    dv: any | undefined;

    constructor() {
    }

    async evaluate(expression: string): Promise<string> {

        let result = "";

        try {
            // @ts-ignore
            const { getAPI } = await import("obsidian-dataview");
            const dv = getAPI();
            if (dv) {
                debugLog("evaluate: expression: " + expression);
                let dvResult = await (dv as any).executeJs(expression);
                debugLog("evaluate: result: " + dvResult.value);
                result = dvResult.value;
            }
        }
        catch (error) {
            console.error("obsidian-dataview:", error);
        }

        return result;

    }

}