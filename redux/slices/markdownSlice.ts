import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FootnoteDefinition } from "mdast";
import { Definition } from "mdast-util-from-markdown/lib";

interface MarkdownState {
  definitions: Definition[];
  footnotes: FootnoteDefinition[];
}

const initialState: MarkdownState = {
  definitions: [],
  footnotes: []
};

const markdownSlice = createSlice({
  name: "markdown",
  initialState,
  reducers: {
    addDefinition(state, action: PayloadAction<Definition>) {
      state.definitions.push(action.payload);
    },
    removeDefinition(state, action: PayloadAction<Definition>) {
      state.definitions.splice(state.definitions.indexOf(action.payload), 1);
    },
    addFootnote(state, action: PayloadAction<FootnoteDefinition>) {
      state.footnotes.push(action.payload);
    },
    removeFootnote(state, action: PayloadAction<FootnoteDefinition>) {
      state.footnotes.splice(state.footnotes.indexOf(action.payload), 1);
    }
  }
});

export default markdownSlice.reducer;

export const { addDefinition, removeDefinition, addFootnote, removeFootnote } =
  markdownSlice.actions;
