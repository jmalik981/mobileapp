import React from 'react';
import NearbyMapFallback from './NearbyMapFallback';

// Since WebView has persistent issues on Android, we're using the fallback
// that opens Google Maps directly where the location marker works reliably
export default function NearbyMapWebView() {
  return <NearbyMapFallback />;
}
