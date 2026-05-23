const WIDTH = 320;

figma.showUI(__html__, { width: WIDTH, height: 360, title: "Desktop Exporter" });

type ExportRequest = { type: "export" };
type CloseRequest = { type: "close" };
type ResizeRequest = { type: "resize"; height: number };
type PluginMessage = ExportRequest | CloseRequest | ResizeRequest;

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === "resize") {
    figma.ui.resize(WIDTH, Math.max(120, Math.min(720, Math.ceil(msg.height))));
    return;
  }

  if (msg.type === "export") {
    try {
      const nodes = getNodesToExport();

      if (nodes.length === 0) {
        figma.ui.postMessage({ type: "empty" });
        return;
      }

      const exported: { name: string; bytes: number[] }[] = [];
      const failures: string[] = [];

      for (const node of nodes) {
        const name = node.name;
        if (!("exportAsync" in node)) {
          failures.push(`${name}: not exportable`);
          continue;
        }
        try {
          const bytes = await node.exportAsync({
            format: "PNG",
            constraint: { type: "SCALE", value: 2 },
          });
          exported.push({ name, bytes: Array.from(bytes) });
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          failures.push(`${name}: ${reason}`);
          console.error(`Failed to export "${name}":`, err);
        }
      }

      // Always reply so the UI never gets stuck on "Exporting…".
      if (exported.length === 0) {
        figma.ui.postMessage({
          type: "error",
          message: failures[0] || "Nothing could be exported.",
        });
        return;
      }

      figma.ui.postMessage({
        type: "done",
        exports: exported,
        pageName: figma.currentPage.name,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      figma.ui.postMessage({ type: "error", message: reason });
    }
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
};

// Selected layers of any type take priority; otherwise fall back to all
// top-level frames on the page.
function getNodesToExport(): SceneNode[] {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    return selection.filter((node) => "exportAsync" in node);
  }

  return figma.currentPage.children.filter(
    (node): node is FrameNode => node.type === "FRAME"
  );
}
