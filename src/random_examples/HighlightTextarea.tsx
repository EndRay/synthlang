import React, { useState } from "react";

export default function HighlightTextarea() {
  const [text, setText] = useState("");
  const highlightWord = "pink"; // word to highlight

  // convert text → HTML with highlights
  const getHighlightedHTML = (t: string) => {
    const escaped = t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const regex = new RegExp(`(${highlightWord})`, "gi");
    return escaped.replace(regex, `<span style="color:pink; ">$1</span>`);
  };

  return (
    <div style={{ position: "relative", width: "400px" }}>

      {/* Transparent textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          position: "relative",
          width: "100%",
          height: "150px",
          padding: "8px",
          background: "transparent",
          color: "black",
          fontFamily: "monospace",
          fontSize: "14px",
          border: "1px solid #ccc",
          resize: "none",
        }}
      />
      {/* Highlight layer */}
      <div
        className="highlight-layer"
        dangerouslySetInnerHTML={{ __html: getHighlightedHTML(text) }}
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          color: "transparent",
          background: "transparent",
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          padding: "8px",
          fontFamily: "monospace",
          fontSize: "14px",
          left: 0,
          top: 0,
        }}
      />
    </div>
  );
}
