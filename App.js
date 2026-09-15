// App.js
import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RootApp from "./src/RootApp";
import { AdminSessionProvider } from "./src/security/AdminSessionContext";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AdminSessionProvider>
        <RootApp />
      </AdminSessionProvider>
    </GestureHandlerRootView>
  );
}
