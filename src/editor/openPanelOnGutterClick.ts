import {EditorView, ViewPlugin} from "@codemirror/view";
import {openLintPanel} from "@codemirror/lint";

export const openPanelOnGutterClick = ViewPlugin.fromClass(class {
  private readonly onMouseDown: (e: MouseEvent) => void;

  constructor(private view: EditorView) {
    this.onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const inGutters = el.closest(".cm-gutters");
      if (!inGutters) return;
      const onLintMarker = el.closest(".cm-lint-marker");
      const onLineNumber = el.closest(".cm-gutter-linenumbers");
      if (onLintMarker || onLineNumber) {
        setTimeout(() => openLintPanel(this.view), 0);
        e.preventDefault();
      }
    };

    // Attach to scrollDOM (contains content + gutters); use capture to beat inner handlers
    this.view.scrollDOM.addEventListener("mousedown", this.onMouseDown, true);
  }

  destroy() {
    this.view.scrollDOM.removeEventListener("mousedown", this.onMouseDown, true);
  }
});