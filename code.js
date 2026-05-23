"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 320, height: 148, title: "Export to Desktop" });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === "export") {
        const frames = getFramesToExport();
        if (frames.length === 0) {
            figma.ui.postMessage({ type: "empty" });
            return;
        }
        const exported = [];
        for (const frame of frames) {
            try {
                const bytes = yield frame.exportAsync({
                    format: "PNG",
                    constraint: { type: "SCALE", value: 2 },
                });
                exported.push({ name: frame.name, bytes: Array.from(bytes) });
            }
            catch (err) {
                console.error(`Failed to export "${frame.name}":`, err);
            }
        }
        figma.ui.postMessage({
            type: "done",
            exports: exported,
            pageName: figma.currentPage.name,
        });
    }
    else if (msg.type === "close") {
        figma.closePlugin();
    }
});
function getFramesToExport() {
    const selected = figma.currentPage.selection.filter((node) => node.type === "FRAME");
    if (selected.length > 0)
        return selected;
    return figma.currentPage.children.filter((node) => node.type === "FRAME");
}
