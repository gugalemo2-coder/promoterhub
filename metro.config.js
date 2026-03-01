const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add the react-native-css-interop cache directory to watchFolders
// This fixes "Failed to get SHA-1" error during Vercel/CI builds
const cssInteropCacheDir = path.resolve(
  __dirname,
  "node_modules/react-native-css-interop/.cache"
);
config.watchFolders = [...(config.watchFolders || []), cssInteropCacheDir];

// Resolve react-native-maps to a web-compatible mock on web platform
// react-native-maps uses codegenNativeComponent which doesn't exist on web
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      filePath: path.resolve(__dirname, "mocks/react-native-maps.web.tsx"),
      type: "sourceFile",
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
