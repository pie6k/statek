import fs from 'fs';
import path from 'path';

const rootPath = path.resolve(__dirname, '../..');

type Dependencies = {
  [key: string]: string;
};

interface Package {
  name: string;
  version: string;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
}

function getPackageFilePath(dirPath: string) {
  return path.resolve(dirPath, 'package.json');
}

function readJsonFile(path: string): any {
  return JSON.parse(fs.readFileSync(path).toString());
}

function getPackageFile(dirPath: string): Package {
  const packageJsonPath = getPackageFilePath(dirPath);

  return readJsonFile(packageJsonPath);
}

function updateJsonFile(path: string, updater: (json: any) => any) {
  const currentJson = readJsonFile(path);

  const newJson = updater(currentJson);

  fs.writeFileSync(path, JSON.stringify(newJson, null, 2));
}

function updatePackageJson(
  packageDir: string,
  updater: (json: Package) => Package,
) {
  const packageJsonFilePath = getPackageFilePath(packageDir);

  updateJsonFile(packageJsonFilePath, updater);
}

function collectPackages() {
  return getDirectories(path.resolve(rootPath, 'packages')).map(packageDir => {
    const name = getPackageFile(packageDir).name;
    return {
      name,
      packageDir,
    };
  });
}

function getDirectories(dirPath: string) {
  return fs
    .readdirSync(dirPath)
    .filter(function (subItem) {
      return fs.statSync(path.resolve(dirPath, subItem)).isDirectory();
    })
    .map(subItem => {
      return path.resolve(dirPath, subItem);
    });
}

async function perform() {
  const version = getPackageFile(rootPath).version;

  const packages = collectPackages();

  const packageNames = packages.map(p => p.name);

  function updateDeps(deps: Dependencies) {
    Object.keys(deps).forEach(depName => {
      if (packageNames.includes(depName)) {
        deps[depName] = version;
      }
    });
  }

  for (const packageInfo of packages) {
    updatePackageJson(packageInfo.packageDir, packageData => {
      packageData.version = version;

      if (packageData.dependencies) {
        updateDeps(packageData.dependencies);
      }

      if (packageData.devDependencies) {
        updateDeps(packageData.devDependencies);
      }

      if (packageData.peerDependencies) {
        updateDeps(packageData.peerDependencies);
      }

      return packageData;
    });
  }
}

perform();
