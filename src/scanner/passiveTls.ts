import { connect } from "node:tls";
import type { TlsEvidence } from "./passive.ts";

export async function getTlsCertificate(
  url: URL,
  timeoutMs: number,
): Promise<TlsEvidence> {
  assertFiniteNonnegativeTimeout(timeoutMs);

  return new Promise((resolve, reject) => {
    const socket = connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      // Keep the socket open long enough to record invalid certificate evidence.
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      socket.end();

      if (!certificate || Object.keys(certificate).length === 0) {
        reject(new Error("No peer certificate returned"));
        return;
      }

      resolve({
        valid: !socket.authorizationError,
        expiresAt: parseCertificateDate(certificate.valid_to),
        issuer: formatIssuer(certificate.issuer),
      });
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("TLS certificate lookup timed out"));
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

function assertFiniteNonnegativeTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError("timeoutMs must be a finite nonnegative number");
  }
}

function parseCertificateDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatIssuer(issuer: unknown): string | undefined {
  if (!isRecord(issuer)) {
    return undefined;
  }
  const commonName = issuer.CN;
  if (typeof commonName === "string" && commonName.length > 0) {
    return commonName;
  }

  const firstIssuerValue = Object.values(issuer).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return firstIssuerValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
