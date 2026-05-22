figma.showUI(__html__, { width: 320, height: 148, title: "Export to Desktop" });

type ExportRequest = { type: "export" };
type CloseRequest = { type: "close" };
type PluginMessage = ExportRequest | CloseRequest;

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === "export") {
    const frames = getFramesToExport();

    if (frames.length === 0) {
      figma.ui.postMessage({ type: "empty" });
      return;
    }

    const exported: { name: string; bytes: number[] }[] = [];

    for (const frame of frames) {
      try {
        const bytes = await frame.exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: 2 },
        });
        exported.push({ name: frame.name, bytes: Array.from(bytes) });
      } catch (err) {
        console.error(`Failed to export "${frame.name}":`, err);
      }
    }

    figma.ui.postMessage({ type: "done", exports: exported });
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
};

function getFramesToExport(): FrameNode[] {
  const selected = figma.currentPage.selection.filter(
    (node): node is FrameNode => node.type === "FRAME"
  );
  if (selected.length > 0) return selected;

  return figma.currentPage.children.filter(
    (node): node is FrameNode => node.type === "FRAME"
  );
}
