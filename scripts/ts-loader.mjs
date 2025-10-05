import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs", ""];

function candidatePaths(basePath) {
  const paths = [];
  for (const ext of EXTENSIONS) {
    paths.push(`${basePath}${ext}`);
  }
  for (const ext of EXTENSIONS) {
    paths.push(path.join(basePath, `index${ext}`));
  }
  return paths;
}

function tryFilePaths(basePath) {
  for (const filePath of candidatePaths(basePath)) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        return pathToFileURL(filePath).href;
      }
    } catch {
      // ignore missing files
    }
  }
  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const aliasPath = path.join(projectRoot, specifier.slice(2));
    const resolved = tryFilePaths(aliasPath);
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : projectRoot;
    const resolved = tryFilePaths(path.resolve(parentPath, specifier));
    if (resolved) {
      return { url: resolved, shortCircuit: true };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(new URL(url), "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: fileURLToPath(url),
    });

    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
