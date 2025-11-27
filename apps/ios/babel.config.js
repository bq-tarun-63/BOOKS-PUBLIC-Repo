module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      [
        "module-resolver",
        {
          alias: {
            "@": "./",
          },
          extensions: [".ios.js", ".android.js", ".native.js", ".js", ".ts", ".tsx", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
