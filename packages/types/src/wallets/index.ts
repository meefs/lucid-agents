export interface WalletMetadata {
  id?: string | null;
  address?: string | null;
  chain?: string | null;
  chainType?: string | null;
  provider?: string | null;
  accountId?: string | null;
  label?: string | null;
  caip2?: string | null;
}

export interface ChallengeSigner {
  signChallenge(challenge: {
    id: string;
    credential_id?: string | null;
    payload?: unknown;
    payload_hash?: string | null;
    nonce: string;
    scopes?: string[];
    issued_at: string | Date;
    expires_at: string | Date;
    server_signature?: string | null;
  }): Promise<string>;
}

export interface WalletConnector extends ChallengeSigner {
  getWalletMetadata(): Promise<WalletMetadata | null>;
  supportsCaip2?(caip2: string): boolean | Promise<boolean>;
  getAddress?(): Promise<string | null>;
}

export interface LocalWalletMetadataOptions {
  address?: string | null;
  caip2?: string | null;
  chain?: string | null;
  chainType?: string | null;
  provider?: string | null;
  label?: string | null;
}

export type LocalWalletWithPrivateKeyOptions = LocalWalletMetadataOptions & {
  type: 'local';
  privateKey: string;
  signer?: never;
};

export interface LucidWalletOptions {
  type: 'lucid';
  baseUrl: string;
  agentRef: string;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  headers?: HeadersInit;
  accessToken?: string | null;
  authorizationContext?: Record<string, unknown>;
}

export type AgentWalletConfig =
  | LocalWalletWithPrivateKeyOptions
  | LucidWalletOptions;

export type DeveloperWalletConfig = LocalWalletWithPrivateKeyOptions;

export type WalletsConfig = {
  agent?: AgentWalletConfig;
  developer?: DeveloperWalletConfig;
};

export type LocalWalletWithSignerOptions = LocalWalletMetadataOptions & {
  type: 'local';
  signer: LocalEoaSigner;
  privateKey?: never;
};

export type LocalWalletOptions =
  | LocalWalletWithSignerOptions
  | LocalWalletWithPrivateKeyOptions;

export type AgentWalletFactoryOptions = LocalWalletOptions | LucidWalletOptions;

export interface LocalEoaSigner {
  signMessage(message: string | Uint8Array): Promise<string>;
  signTypedData?(payload: {
    domain: Record<string, unknown>;
    primaryType: string;
    types: Record<string, Array<{ name: string; type: string }>>;
    message: Record<string, unknown>;
  }): Promise<string>;
  signTransaction?(transaction: {
    to?: `0x${string}` | null;
    value?: bigint;
    data?: `0x${string}`;
    gas?: bigint;
    gasPrice?: bigint;
    nonce?: number;
    chainId?: number;
  }): Promise<`0x${string}`>;
  getAddress?(): Promise<string | null>;
}

export interface AgentChallenge {
  id: string;
  credential_id?: string | null;
  payload?: unknown;
  payload_hash?: string | null;
  nonce: string;
  scopes?: string[];
  issued_at: string | Date;
  expires_at: string | Date;
  server_signature?: string | null;
}

export interface AgentChallengeResponse {
  challenge: AgentChallenge;
}

export type TypedDataPayload = {
  domain: Record<string, unknown>;
  primaryType: string;
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, unknown>;
};

export type FetchExecutor = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type AgentWalletKind = 'local' | 'lucid';

export interface AgentWalletHandle {
  kind: AgentWalletKind;
  connector: WalletConnector;
  setAccessToken?(token: string | null): void;
}
