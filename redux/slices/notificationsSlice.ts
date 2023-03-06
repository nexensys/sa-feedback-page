import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { UserNotification } from "../../common/types";

interface NotificationsState {
  hasUnread: boolean;
  notifications: SerializedUserNotification[];
  wasIdle: boolean;
  loadingState: "idle" | "pending" | "suceeded" | "failed";
}

const initialState: NotificationsState = {
  hasUnread: false,
  notifications: [],
  wasIdle: true,
  loadingState: "idle"
};

type SerializedUserNotification = {
  [key in keyof UserNotification]: UserNotification[key];
} & {
  sent: string;
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async () => {
    const notificationsReq = await fetch("/sessions/notifications/", {
      method: "GET"
    });
    return await notificationsReq.json();
  }
);

export const markAllRead = createAsyncThunk(
  "notifications/markAllRead",
  async () => {
    await fetch("/sessions/notifications/read", { method: "POST" });
  }
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (uuid: string) => {
    await fetch("/sessions/notifications/read", {
      method: "POST",
      body: JSON.stringify({ notification: uuid }),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
);

export const clearAll = createAsyncThunk("notifications/clearAll", async () => {
  await fetch("/sessions/notifications/remove", { method: "POST" });
});

export const clearOne = createAsyncThunk(
  "notifications/clearOne",
  async (uuid: string) => {
    await fetch("/sessions/notifications/remove", {
      method: "POST",
      body: JSON.stringify({ notification: uuid }),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setHasUnread(state, action: PayloadAction<boolean>) {
      state.hasUnread = action.payload;
    }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loadingState = "pending";
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loadingState = "failed";
        state.wasIdle = false;
      })
      .addCase(
        fetchNotifications.fulfilled,
        (state, action: PayloadAction<SerializedUserNotification[]>) => {
          state.loadingState = "suceeded";
          state.notifications = action.payload;
          state.wasIdle = false;
          state.hasUnread = action.payload.some((n) => !n.viewed);
        }
      );
    builder
      .addCase(markAllRead.pending, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          read: true
        }));
        state.hasUnread = false;
      })
      .addCase(markAsRead.pending, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.uuid === action.meta.arg
        );
        if (notification) notification.viewed = true;

        state.hasUnread = state.notifications.some((n) => !n.viewed);
      });
    builder
      .addCase(clearAll.pending, (state) => {
        state.notifications = [];
        state.hasUnread = false;
      })
      .addCase(clearOne.pending, (state, action) => {
        state.notifications.splice(
          state.notifications.findIndex((n) => n.uuid === action.meta.arg),
          1
        );
        state.hasUnread = state.notifications.some((n) => !n.viewed);
      });
  }
});

export default notificationsSlice.reducer;

export const { setHasUnread } = notificationsSlice.actions;
