import { useEffect, useState } from "react";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

type CaretPosition = {
  left: number;
  top: number;
  height: number;
  visible: boolean;
};

const TEXT_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isTextControl(element: Element | null): element is TextControl {
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  return TEXT_INPUT_TYPES.has(element.type);
}

function getCaretIndex(element: TextControl) {
  return element.selectionStart ?? element.value.length;
}

function getCaretPosition(element: TextControl): CaretPosition | null {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
  const borderTop = parseFloat(styles.borderTopWidth) || 0;
  const paddingLeft = parseFloat(styles.paddingLeft) || 0;
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) || 16;
  const font = [
    styles.fontStyle,
    styles.fontVariant,
    styles.fontWeight,
    styles.fontSize,
    styles.fontFamily,
  ].join(" ");
  const mirror = document.createElement("span");
  const marker = document.createElement("span");
  const isTextarea = element instanceof HTMLTextAreaElement;
  const valueBeforeCaret = element.value.slice(0, getCaretIndex(element));
  const valueWithMarker = valueBeforeCaret || "\u200b";

  mirror.style.position = "fixed";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = isTextarea ? "pre-wrap" : "pre";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.font = font;
  mirror.style.letterSpacing = styles.letterSpacing;
  mirror.style.textTransform = styles.textTransform;
  mirror.style.textIndent = styles.textIndent;
  mirror.style.padding = styles.padding;
  mirror.style.border = styles.border;
  mirror.style.boxSizing = styles.boxSizing;
  mirror.style.width = `${element.clientWidth}px`;
  mirror.style.lineHeight = styles.lineHeight;
  mirror.style.left = `${rect.left - element.scrollLeft}px`;
  mirror.style.top = `${rect.top - element.scrollTop}px`;

  const text = document.createTextNode(valueWithMarker);
  mirror.append(text, marker);
  document.body.appendChild(mirror);

  const markerRect = marker.getBoundingClientRect();
  const textTop = isTextarea
    ? markerRect.top
    : rect.top + borderTop + paddingTop + Math.max(0, (element.clientHeight - borderTop * 2 - paddingTop * 2 - lineHeight) / 2);
  const textLeft = markerRect.left;
  const caretHeight = Math.max(14, Math.min(18, lineHeight * 0.82));

  mirror.remove();

  return {
    left: textLeft,
    top: textTop + Math.max(0, (lineHeight - caretHeight) / 2),
    height: caretHeight,
    visible: document.activeElement === element,
  };
}

export function CompactCaret() {
  const [position, setPosition] = useState<CaretPosition | null>(null);

  useEffect(() => {
    const update = () => {
      const activeElement = document.activeElement;
      if (!isTextControl(activeElement)) {
        setPosition(null);
        return;
      }

      setPosition(getCaretPosition(activeElement));
    };

    const scheduleUpdate = () => window.requestAnimationFrame(update);

    document.addEventListener("focusin", scheduleUpdate);
    document.addEventListener("focusout", scheduleUpdate);
    document.addEventListener("input", scheduleUpdate, true);
    document.addEventListener("keyup", scheduleUpdate, true);
    document.addEventListener("click", scheduleUpdate, true);
    document.addEventListener("selectionchange", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    update();
    return () => {
      document.removeEventListener("focusin", scheduleUpdate);
      document.removeEventListener("focusout", scheduleUpdate);
      document.removeEventListener("input", scheduleUpdate, true);
      document.removeEventListener("keyup", scheduleUpdate, true);
      document.removeEventListener("click", scheduleUpdate, true);
      document.removeEventListener("selectionchange", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, []);

  if (!position?.visible) return null;

  return (
    <span
      aria-hidden="true"
      className="compact-caret pointer-events-none fixed z-[9999] rounded-full bg-primary transition-opacity duration-75"
      style={{
        left: position.left,
        top: position.top,
        width: "1.5px",
        height: position.height,
      }}
    />
  );
}
