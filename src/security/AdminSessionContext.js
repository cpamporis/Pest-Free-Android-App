import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState, Platform } from "react-native";

import apiService from "../services/apiService";

const {
  normalizeAdminSession,
  validateRefreshedSession,
  remainingSessionSeconds,
  canApplySessionRefresh
} = require("./adminSessionPolicy");

const AdminSessionContext = createContext(null);
const WEB_CHANNEL_NAME =
  "pestify.production.admin-session.v1";

export function AdminSessionProvider({ children }) {
  const [active, setActive] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [expiredAt, setExpiredAt] = useState(null);
  const activeRef = useRef(null);
  const refreshPromiseRef = useRef(null);
  const channelRef = useRef(null);

  const replaceActive = useCallback((next) => {
    activeRef.current = next;
    setActive(next);
    setNow(Date.now());
  }, []);

  const clearAdminSession = useCallback(
    (markExpired = false) => {
      replaceActive(null);
      setRefreshing(false);
      setRefreshError(null);

      if (markExpired) {
        setExpiredAt(Date.now());
      }
    },
    [replaceActive]
  );

  const startAdminSession = useCallback(
    (role, session) => {
      const normalized = normalizeAdminSession(
        role,
        session
      );

      setExpiredAt(null);
      setRefreshError(null);
      replaceActive({ role, session: normalized });
      return normalized;
    },
    [replaceActive]
  );

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const subscription = AppState.addEventListener(
      "change",
      state => {
        if (state === "active") {
          setNow(Date.now());
        }
      }
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [active]);

  const remainingSeconds = remainingSessionSeconds(
    active?.session,
    now
  );

  useEffect(() => {
    if (!active || remainingSeconds > 0) {
      return;
    }

    apiService.clearAuthToken();
    clearAdminSession(true);
  }, [active, clearAdminSession, remainingSeconds]);

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return undefined;
    }

    const channel = new BroadcastChannel(WEB_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = async event => {
      const message = event?.data;

      if (message?.type === "logout") {
        await apiService.clearAuthToken();
        clearAdminSession(true);
        return;
      }

      if (
        message?.type !== "refreshed" ||
        typeof message?.token !== "string"
      ) {
        return;
      }

      const current = activeRef.current;

      if (!current || message.role !== current.role) {
        return;
      }

      if (
        message?.session?.id !== current.session.id ||
        Date.parse(message?.session?.absoluteExpiresAt) !==
          current.session.absoluteExpiresAtMs ||
        Number(message?.session?.refreshVersion) <=
          current.session.refreshVersion
      ) {
        return;
      }

      try {
        const normalized = validateRefreshedSession(
          current.session,
          current.role,
          message.session
        );

        await apiService.setAuthToken(message.token);
        replaceActive({
          role: current.role,
          session: normalized
        });
        setRefreshError(null);
      } catch {
        await apiService.clearAuthToken();
        clearAdminSession(true);
      }
    };

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [clearAdminSession, replaceActive]);

  const refreshAdminSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const current = activeRef.current;

    if (!current) {
      return { success: false, error: "No active session" };
    }

    if (remainingSessionSeconds(current.session) === 0) {
      await apiService.clearAuthToken();
      clearAdminSession(true);
      return { success: false, error: "Session expired" };
    }

    const operation = (async () => {
      setRefreshing(true);
      setRefreshError(null);

      const result = await apiService.refreshAdminSession();

      if (!result?.success) {
        if (
          result?.status === 401 ||
          result?.authenticationStorageFailure === true ||
          result?.invalidSessionResponse === true
        ) {
          await apiService.clearAuthToken();
          clearAdminSession(true);
        } else {
          setRefreshError(
            result?.error || "Session refresh failed"
          );
        }

        return result;
      }

      try {
        const liveCurrent = activeRef.current;

        if (!canApplySessionRefresh(current, liveCurrent)) {
          await apiService.clearAuthToken();
          clearAdminSession(true);
          return {
            success: false,
            error: "Session expired before refresh completed"
          };
        }

        const normalized = validateRefreshedSession(
          liveCurrent.session,
          liveCurrent.role,
          result.session
        );

        replaceActive({
          role: liveCurrent.role,
          session: normalized
        });

        channelRef.current?.postMessage({
          type: "refreshed",
          role: liveCurrent.role,
          token: result.token,
          session: result.session
        });

        return { ...result, session: normalized };
      } catch (error) {
        await apiService.clearAuthToken();
        clearAdminSession(true);
        return { success: false, error: error.message };
      }
    })().finally(() => {
      refreshPromiseRef.current = null;
      setRefreshing(false);
    });

    refreshPromiseRef.current = operation;
    return operation;
  }, [clearAdminSession, replaceActive]);

  const broadcastLogout = useCallback(() => {
    channelRef.current?.postMessage({ type: "logout" });
  }, []);

  const value = useMemo(
    () => ({
      role: active?.role || null,
      session: active?.session || null,
      remainingSeconds,
      refreshing,
      refreshError,
      expiredAt,
      startAdminSession,
      clearAdminSession,
      refreshAdminSession,
      broadcastLogout
    }),
    [
      active,
      remainingSeconds,
      refreshing,
      refreshError,
      expiredAt,
      startAdminSession,
      clearAdminSession,
      refreshAdminSession,
      broadcastLogout
    ]
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error(
      "useAdminSession must be used inside AdminSessionProvider"
    );
  }

  return context;
}
