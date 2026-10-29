const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

function resolveWorkspaceModule(name) {
  const candidates = [
    path.resolve(projectRoot, "node_modules", name),
    path.resolve(workspaceRoot, "node_modules", name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error(`Metro: module introuvable (${name}).`);
}

const reactPath = resolveWorkspaceModule("react");
const reactVersion = require(path.join(reactPath, "package.json")).version;
if (!reactVersion.startsWith("18.")) {
  throw new Error(
    `Expo SDK 52 exige React 18.3.x. Metro a résolu React ${reactVersion} depuis ${reactPath}. ` +
      "React 19 (admin Next.js) ne doit pas être bundlé dans le mobile.",
  );
}

const extraNodeModules = {
  react: reactPath,
  "react-native": resolveWorkspaceModule("react-native"),
  scheduler: resolveWorkspaceModule("scheduler"),
  "expo-font": resolveWorkspaceModule("expo-font"),
};

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;
