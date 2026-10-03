import fs from "node:fs";

const path = "android/twa-manifest.json";
const mode = process.argv[2] ?? "patch";
const manifest = JSON.parse(fs.readFileSync(path, "utf8")) as {
  appVersion: string;
  appVersionCode: number;
};

const parts = manifest.appVersion.split(".").map(Number);
if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
  throw new Error("appVersion must use major.minor.patch format.");
}

if (mode === "major") {
  parts[0] += 1; parts[1] = 0; parts[2] = 0;
} else if (mode === "minor") {
  parts[1] += 1; parts[2] = 0;
} else if (mode === "patch") {
  parts[2] += 1;
} else {
  throw new Error("Usage: npm run android:version -- major|minor|patch");
}

manifest.appVersion = parts.join(".");
manifest.appVersionCode += 1;
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Android version -> ${manifest.appVersion} (${manifest.appVersionCode})`);
