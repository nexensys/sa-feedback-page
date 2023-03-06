import markdownSlice from "./slices/markdownSlice";
import notificationsSlice from "./slices/notificationsSlice";

const reducer = {
  notifications: notificationsSlice,
  markdown: markdownSlice
};

export default reducer;
