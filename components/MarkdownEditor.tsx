import { Root } from "mdast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { MdRoot } from "./mdcomponents";
import { useConditionalChangeEffect } from "@common/hooks";
import style from "@styles/MarkdownEditor.module.css";
import { buttonProps } from "../common/util";

const MAX_UNDO = 50;

const MarkdownEditor: React.FC<{
  setValue: (value: string) => void;
  value: string;
  className?: string;
}> = ({ setValue, value, className }) => {
  const [tabSelected, setTabSelected] = useState<"edit" | "preview">("edit");
  const [mdAst, setAst] = useState<Root>({
    type: "root",
    children: []
  });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<[number | null, number | null]>([
    null,
    null
  ]);

  useEffect(() => {
    if (tabSelected === "preview") {
      setAst(
        fromMarkdown(value, {
          extensions: [gfm()],
          mdastExtensions: [gfmFromMarkdown()]
        })
      );
    }
  }, [tabSelected, value]);
  useConditionalChangeEffect(
    (changes) => {
      if (tabSelected === "edit" && changes[1] && changes[2]) {
        textAreaRef.current?.setSelectionRange(selection[0], selection[1]);
        setSelection([null, null]);
      }
    },
    [tabSelected, value, selection]
  );

  const undoStack = useMemo<
    { value: string; selection: [number | null, number | null] }[]
  >(() => [], []);
  const redoStack = useMemo<
    { value: string; selection: [number | null, number | null] }[]
  >(() => [], []);

  const addToStack = useCallback(
    (
      val:
        | string
        | { value: string; selection: [number | null, number | null] },
      dontClear?: boolean
    ) => {
      if (typeof val === "string")
        undoStack.push({
          value: val,
          selection: [
            selection[0] || (textAreaRef.current?.selectionStart ?? null),
            selection[1] || (textAreaRef.current?.selectionEnd ?? null)
          ]
        });
      else undoStack.push(val);
      while (undoStack.length > MAX_UNDO) {
        undoStack.shift();
      }
      if (!dontClear) redoStack.splice(0, MAX_UNDO);
    },
    [undoStack, redoStack, textAreaRef, selection]
  );
  const removeFromStack = useCallback(() => {
    const removedValue = undoStack.pop();
    if (removedValue) redoStack.push(removedValue);
    while (redoStack.length > MAX_UNDO) {
      redoStack.shift();
    }
  }, [undoStack, redoStack]);

  const updateState = useCallback(() => {
    const state = undoStack.slice(-1)[0];
    if (!state) return;
    setValue(state.value);
    setSelection(state.selection);
  }, [undoStack, setValue, setSelection]);
  const undo = useCallback(() => {
    removeFromStack();
    updateState();
  }, [removeFromStack, updateState]);
  const redo = useCallback(() => {
    const redoAction = redoStack.pop();
    if (redoAction) addToStack(redoAction, true);
    updateState();
  }, [addToStack, redoStack, updateState]);

  return (
    <div className={`${style.editorwrapper} ${className || ""}`}>
      <div className={style.editortabs}>
        <div
          className={style.tab}
          aria-selected={tabSelected === "edit"}
          {...buttonProps(() => setTabSelected("edit"))}
          role="tab"
        >
          Edit
        </div>
        <div
          className={style.tab}
          aria-selected={tabSelected === "preview"}
          {...buttonProps(() => setTabSelected("preview"))}
          role="tab"
        >
          Preview
        </div>
      </div>
      <div className={style.editor}>
        {tabSelected === "edit" ? (
          <textarea
            required
            placeholder="Markdown content here..."
            ref={textAreaRef}
            className={style.editortextarea}
            value={value}
            onChange={(e) => {
              addToStack({
                value: e.currentTarget.value,
                selection: [
                  e.currentTarget.selectionStart,
                  e.currentTarget.selectionEnd
                ]
              });
              updateState();
            }}
            onKeyDown={(e) => {
              if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                undo();
              }
              if (e.key === "y" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                redo();
              }
              if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
                addToStack({
                  value: `${value.substring(
                    0,
                    e.currentTarget.selectionStart
                  )}**${value.substring(
                    e.currentTarget.selectionStart,
                    e.currentTarget.selectionEnd
                  )}**${value.slice(e.currentTarget.selectionEnd)}`,
                  selection: [
                    e.currentTarget.selectionStart + 2,
                    e.currentTarget.selectionEnd + 2
                  ]
                });
                updateState();
              }
              if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
                addToStack({
                  value: `${value.substring(
                    0,
                    e.currentTarget.selectionStart
                  )}*${value.substring(
                    e.currentTarget.selectionStart,
                    e.currentTarget.selectionEnd
                  )}*${value.slice(e.currentTarget.selectionEnd)}`,
                  selection: [
                    e.currentTarget.selectionStart + 1,
                    e.currentTarget.selectionEnd + 1
                  ]
                });
                updateState();
              }
            }}
          />
        ) : (
          <MdRoot root={mdAst} />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
