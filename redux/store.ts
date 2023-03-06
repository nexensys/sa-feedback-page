import { Action, applyMiddleware } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import reducer from "./reducer";
import thunk, { ThunkAction } from "redux-thunk";
import { createWrapper } from "next-redux-wrapper";
import { useDispatch, TypedUseSelectorHook, useSelector } from "react-redux";

export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(thunk),
  devTools: true // todo: set to false before prod
});

export const wrapper = createWrapper(() => store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
