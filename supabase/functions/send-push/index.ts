import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto helpers for VAPID + payload encryption
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJwt(endpoint: string, vapidPrivateKeyBase64: string, vapidPublicKeyBase64: string): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: "mailto:noreply@ghostpen.com" };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyRaw = urlBase64ToUint8Array(vapidPrivateKeyBase64);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: uint8ArrayToBase64Url(privateKeyRaw), x: "", y: "" },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Fallback: import as pkcs8-like raw 32 bytes
    const jwk = await rawPrivateToJwk(privateKeyRaw, vapidPublicKeyBase64);
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER encoded
    const r = extractDerInt(sigBytes, 3);
    const sOffset = 3 + sigBytes[3] + 2;
    const s = extractDerInt(sigBytes, sOffset);
    rawSig = new Uint8Array(64);
    rawSig.set(padTo32(r), 0);
    rawSig.set(padTo32(s), 32);
  }

  const token = `${unsignedToken}.${uint8ArrayToBase64Url(rawSig)}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKeyBase64}`,
    cryptoKey: `p256ecdsa=${vapidPublicKeyBase64}`,
  };
}

function extractDerInt(buf: Uint8Array, offset: number): Uint8Array {
  const len = buf[offset + 1];
  return buf.slice(offset + 2, offset + 2 + len);
}

function padTo32(arr: Uint8Array): Uint8Array {
  if (arr.length === 32) return arr;
  if (arr.length > 32) return arr.slice(arr.length - 32);
  const padded = new Uint8Array(32);
  padded.set(arr, 32 - arr.length);
  return padded;
}

async function rawPrivateToJwk(privateKeyRaw: Uint8Array, publicKeyBase64: string) {
  const pubBytes = urlBase64ToUint8Array(publicKeyBase64);
  // pubBytes should be 65 bytes: 0x04 || x(32) || y(32)
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  return {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(privateKeyRaw),
  };
}

// Encrypt push message payload using aes128gcm
async function encryptPayload(
  clientPublicKeyBase64: string,
  clientAuthBase64: string,
  payload: Uint8Array
) {
  const clientPublicKey = urlBase64ToUint8Array(clientPublicKeyBase64);
  const clientAuth = urlBase64ToUint8Array(clientAuthBase64);

  // Generate ephemeral ECDH key pair
  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));

  // Import client public key
  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, localKeys.privateKey, 256));

  // HKDF for auth secret  
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKey.length + localPublicKeyRaw.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(clientPublicKey, authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + clientPublicKey.length);

  const ikm = await hkdf(clientAuth, sharedSecret, authInfoFull, 32);

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const prk = await hkdf(salt, ikm, new Uint8Array(0), 32);
  const contentEncryptionKey = await hkdf(new Uint8Array(0), prk, cekInfo, 16);
  const nonce = await hkdf(new Uint8Array(0), prk, nonceInfo, 12);

  // Pad payload (add delimiter byte 0x02)
  const paddedPayload = new Uint8Array(payload.length + 1);
  paddedPayload.set(payload);
  paddedPayload[payload.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, paddedPayload));

  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, paddedPayload.length + 16 + 1); // record size

  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  header.set(rs, 16);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header);
  body.set(encrypted, header.length);

  return body;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt.length ? salt : new Uint8Array(32), "HKDF", false, ["deriveBits"]);
  
  // Use HMAC-based extract + expand
  const extractKey = await crypto.subtle.importKey("raw", salt.length ? salt : new Uint8Array(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, ikm));

  const expandKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", expandKey, infoWithCounter));

  return okm.slice(0, length);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    // If GET, return public key
    if (req.method === "GET") {
      return new Response(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userIds, title, body, url } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "userIds required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscriptions for target users
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title: title || "GhostPen", body: body || "", url: url || "/" });
    const payloadBytes = new TextEncoder().encode(payload);

    let sent = 0;
    const expiredIds: string[] = [];

    for (const sub of subs) {
      try {
        const encrypted = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);
        const vapid = await createVapidJwt(sub.endpoint, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            Authorization: vapid.authorization,
            TTL: "86400",
            Urgency: "high",
          },
          body: encrypted,
        });

        if (res.status === 201 || res.status === 200) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          expiredIds.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${res.status} ${await res.text()}`);
        }
      } catch (err) {
        console.error(`Push error for ${sub.endpoint}:`, err);
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return new Response(JSON.stringify({ sent, total: subs.length, expired: expiredIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Push error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
