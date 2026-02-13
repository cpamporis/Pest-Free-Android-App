// App.js
import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RootApp from "./src/RootApp";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootApp />
    </GestureHandlerRootView>
  );
}