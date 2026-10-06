const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Block ONLY <project>/server, not any path that happens to contain "server/"
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const serverDir = path.resolve(__dirname, "server");

config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(serverDir)}[\\\\/].*`),
];

module.exports = config;
