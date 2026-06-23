const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Tell Metro to ignore the server/ folder
config.watchFolders = [];
config.resolver.blockList = [/server\/.*/];

module.exports = config;
