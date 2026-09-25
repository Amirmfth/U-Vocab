import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  credentialsMatch,
  verifySessionToken,
} from "./auth-session";

test("credentials and signed sessions reject invalid input", async () => {
  const beforeUser=process.env.APP_AUTH_USERNAME;
  const beforePassword=process.env.APP_AUTH_PASSWORD;
  const beforeDisabled=process.env.APP_AUTH_DISABLED;
  process.env.APP_AUTH_USERNAME="tester";
  process.env.APP_AUTH_PASSWORD="correct horse battery staple";
  delete process.env.APP_AUTH_DISABLED;

  try {
    assert.equal(await credentialsMatch("tester","correct horse battery staple"),true);
    assert.equal(await credentialsMatch("tester","wrong"),false);

    const token=await createSessionToken(1_000);
    assert.equal(await verifySessionToken(token,2_000),true);
    assert.equal(await verifySessionToken(token+"x",2_000),false);
    assert.equal(await verifySessionToken(token,1_000+15*24*60*60*1000),false);
  } finally {
    if(beforeUser===undefined) delete process.env.APP_AUTH_USERNAME; else process.env.APP_AUTH_USERNAME=beforeUser;
    if(beforePassword===undefined) delete process.env.APP_AUTH_PASSWORD; else process.env.APP_AUTH_PASSWORD=beforePassword;
    if(beforeDisabled===undefined) delete process.env.APP_AUTH_DISABLED; else process.env.APP_AUTH_DISABLED=beforeDisabled;
  }
});
