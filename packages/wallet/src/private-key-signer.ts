import { privateKeyToAccount } from "viem/accounts";

import type { LocalEoaSigner, TypedDataPayload } from '@lucid-agents/types/wallets';

const normalizePrivateKey = (key: string): `0x${string}` => {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error("privateKey must be a non-empty string");
  }
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
};

export const createPrivateKeySigner = (privateKey: string): LocalEoaSigner => {
  const account = privateKeyToAccount(normalizePrivateKey(privateKey));

  return {
    async signMessage(message) {
      const payload =
        typeof message === "string"
          ? { message }
          : { message: { raw: message } };
      return account.signMessage(payload as never);
    },
    async signTypedData(payload: TypedDataPayload) {
      return account.signTypedData({
        domain: payload.domain as Record<string, unknown>,
        message: payload.message as Record<string, unknown>,
        types: payload.types as never,
        primaryType: payload.primary_type as never,
      } as never);
    },
    async getAddress() {
      return account.address;
    },
  };
};

