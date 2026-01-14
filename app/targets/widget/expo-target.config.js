/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: 'https://github.com/expo.png',
  entitlements: {
    // App groups for sharing data between main app and widget extension
    "com.apple.security.application-groups": [
      `group.${config.ios?.bundleIdentifier || 'com.bilby.app'}.widget`,
    ],
  },
  // Enable push notifications for Live Activity updates
  frameworks: ["ActivityKit"],
});