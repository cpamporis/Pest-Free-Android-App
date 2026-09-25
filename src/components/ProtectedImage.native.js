import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import apiService from "../services/apiService";

const {
  privateUploadUrl,
  isUploadReference
} = require("../utils/privateUploadUrl");

export function authenticatedImageSource(source, token) {
  if (!source?.uri || !isUploadReference(source.uri)) {
    return source;
  }

  const uri = privateUploadUrl(source.uri, apiService.API_BASE_URL);
  if (!uri || !token) return null;

  return {
    ...source,
    uri,
    headers: { Authorization: `Bearer ${token}` },
    cache: "reload"
  };
}

export default function ProtectedImage({ source, ...props }) {
  const [token, setToken] = useState(apiService.getCurrentToken());

  useEffect(
    () => apiService.subscribePrivateImageSession(setToken),
    []
  );

  return (
    <Image
      {...props}
      source={authenticatedImageSource(source, token)}
    />
  );
}
