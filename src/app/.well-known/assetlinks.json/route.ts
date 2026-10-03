const PACKAGE_NAME = "ir.uvocab.app";
const RELATION = "delegate_permission/common.handle_all_urls";

function fingerprints() {
  return (process.env.ANDROID_TWA_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .filter((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
}

export async function GET() {
  const sha256_cert_fingerprints = fingerprints();
  const body = sha256_cert_fingerprints.length
    ? [
        {
          relation: [RELATION],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints,
          },
        },
      ]
    : [];

  return Response.json(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}
