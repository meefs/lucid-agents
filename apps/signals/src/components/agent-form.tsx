import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Plus,
  Trash2,
  Loader2,
  Wallet,
  CreditCard,
  Network,
  ShoppingCart,
  BarChart3,
  Fingerprint,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useCreateAgent,
  useUpdateAgent,
  type CreateAgent,
  type UpdateAgent,
  type SerializedEntrypoint,
  type PaymentsConfigWithStorage,
  type WalletsConfig,
  type A2aConfig,
  type Ap2Config,
  type AnalyticsConfig,
  type IdentityConfig,
  type AgentDefinition,
} from '@/api';

// ============================================================================
// Types
// ============================================================================

type HandlerType = 'builtin' | 'js' | 'url';
type WalletType = 'local' | 'thirdweb';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
}

export interface EntrypointFormData {
  id: string;
  key: string;
  description: string;
  handlerType: HandlerType;
  builtinName: string;
  jsCode: string;
  urlEndpoint: string;
  urlMethod: 'GET' | 'POST';
  price: string;
  inputFields: SchemaField[];
  outputFields: SchemaField[];
}

export interface PaymentsFormData {
  enabled: boolean;
  payTo: string;
  network: string;
  facilitatorUrl: string;
  storageType: 'sqlite' | 'postgres';
  postgresConnectionString: string;
}

export interface WalletFormData {
  enabled: boolean;
  type: WalletType;
  privateKey: string;
  secretKey: string;
  clientId: string;
  walletLabel: string;
  network: string; // EVM network (e.g., 'base-sepolia') - replaces chainId
}

export interface AP2FormData {
  enabled: boolean;
  roles: string[];
  description: string;
  required: boolean;
}

export interface AnalyticsFormData {
  enabled: boolean;
}

export interface IdentityFormData {
  enabled: boolean;
  network: string;
  registryAddress: string;
  autoRegister: boolean;
  trustModels: string[];
  trustOverrides: {
    validationRequestsUri?: string;
    validationResponsesUri?: string;
    feedbackDataUri?: string;
  };
}

export interface AgentFormProps {
  /** Mode: 'create' for new agents, 'edit' for existing ones */
  mode: 'create' | 'edit';
  /** Initial agent data for edit mode */
  initialData?: AgentDefinition;
  /** Called when the form submission succeeds */
  onSuccess?: (agent: AgentDefinition) => void;
  /** Cancel navigation path */
  cancelPath?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const NETWORK_OPTIONS = [
  { value: 'base-sepolia', label: 'Base Sepolia (Testnet)' },
  { value: 'base', label: 'Base (Mainnet)' },
  { value: 'ethereum-sepolia', label: 'Ethereum Sepolia (Testnet)' },
  { value: 'ethereum', label: 'Ethereum (Mainnet)' },
  { value: 'solana-devnet', label: 'Solana Devnet' },
  { value: 'solana', label: 'Solana (Mainnet)' },
];

export const EVM_NETWORK_OPTIONS = [
  { value: 'base-sepolia', label: 'Base Sepolia (Testnet)', chainId: 84532 },
  { value: 'base', label: 'Base (Mainnet)', chainId: 8453 },
  {
    value: 'ethereum-sepolia',
    label: 'Ethereum Sepolia (Testnet)',
    chainId: 11155111,
  },
  { value: 'ethereum', label: 'Ethereum (Mainnet)', chainId: 1 },
];

// ============================================================================
// Utilities
// ============================================================================

function createEmptySchemaField(): SchemaField {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'string',
    required: false,
    description: '',
  };
}

export function createEmptyEntrypoint(): EntrypointFormData {
  return {
    id: crypto.randomUUID(),
    key: '',
    description: '',
    handlerType: 'builtin',
    builtinName: 'echo',
    jsCode: '// Your code here\nreturn { message: "Hello from JS!" };',
    urlEndpoint: '',
    urlMethod: 'POST',
    price: '',
    inputFields: [],
    outputFields: [],
  };
}

function schemaFieldsToJsonSchema(
  fields: SchemaField[]
): Record<string, unknown> | undefined {
  if (fields.length === 0) return undefined;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (!field.name.trim()) continue;

    const prop: Record<string, unknown> = { type: field.type };
    if (field.description) prop.description = field.description;

    properties[field.name] = prop;
    if (field.required) required.push(field.name);
  }

  if (Object.keys(properties).length === 0) return undefined;

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
  };
  if (required.length > 0) schema.required = required;

  return schema;
}

function jsonSchemaToFields(schema?: Record<string, unknown>): SchemaField[] {
  if (!schema || typeof schema !== 'object') return [];

  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!properties) return [];

  const required = (schema.required as string[]) || [];

  return Object.entries(properties).map(([name, prop]) => ({
    id: crypto.randomUUID(),
    name,
    type: (prop.type as SchemaField['type']) || 'string',
    required: required.includes(name),
    description: (prop.description as string) || '',
  }));
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function entrypointFromApi(ep: SerializedEntrypoint): EntrypointFormData {
  const config = ep.handlerConfig as Record<string, unknown>;
  return {
    id: crypto.randomUUID(),
    key: ep.key,
    description: ep.description || '',
    handlerType: (ep.handlerType as HandlerType) || 'builtin',
    builtinName: (config?.name as string) || 'echo',
    jsCode:
      (config?.code as string) ||
      '// Your code here\nreturn { message: "Hello from JS!" };',
    urlEndpoint: (config?.url as string) || '',
    urlMethod: ((config?.method as string) || 'POST') as 'GET' | 'POST',
    price: ep.price || '',
    inputFields: jsonSchemaToFields(ep.inputSchema),
    outputFields: jsonSchemaToFields(ep.outputSchema),
  };
}

function paymentsFromApi(config?: PaymentsConfigWithStorage): PaymentsFormData {
  const storageConfig = config?.storage;
  return {
    enabled: !!config,
    payTo: config?.payTo || '',
    network: config?.network || 'base-sepolia',
    facilitatorUrl:
      config?.facilitatorUrl || 'https://facilitator.daydreams.systems',
    storageType: storageConfig?.type || 'sqlite',
    postgresConnectionString: storageConfig?.postgres?.connectionString || '',
  };
}

function walletFromApi(config?: WalletsConfig): WalletFormData {
  const agent = config?.agent;
  // Map chainId to network if we have it
  let network = 'base-sepolia';
  if (agent?.chainId) {
    const networkOption = EVM_NETWORK_OPTIONS.find(
      opt => opt.chainId === agent.chainId
    );
    if (networkOption) {
      network = networkOption.value;
    }
  }
  return {
    enabled: !!agent,
    type: (agent?.type as WalletType) || 'local',
    privateKey: agent?.privateKey || '',
    secretKey: agent?.secretKey || '',
    clientId: agent?.clientId || '',
    walletLabel: agent?.walletLabel || '',
    network,
  };
}

function ap2FromApi(config?: Ap2Config): AP2FormData {
  return {
    enabled: !!config,
    roles: config?.roles || [],
    description: config?.description || '',
    required: config?.required ?? false,
  };
}

function analyticsFromApi(config?: AnalyticsConfig): AnalyticsFormData {
  return {
    enabled: config?.enabled ?? false,
  };
}

function identityFromApi(config?: IdentityConfig): IdentityFormData {
  let network = 'base-sepolia';
  if (config?.chainId) {
    const networkOption = EVM_NETWORK_OPTIONS.find(
      opt => opt.chainId === config.chainId
    );
    if (networkOption) {
      network = networkOption.value;
    }
  }
  return {
    enabled: !!config,
    network,
    registryAddress: config?.registryAddress || '',
    autoRegister: config?.autoRegister ?? false,
    trustModels: config?.trustModels || ['feedback', 'inference-validation'],
    trustOverrides: config?.trustOverrides || {},
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentForm({
  mode,
  initialData,
  onSuccess,
  cancelPath = '/',
}: AgentFormProps) {
  const navigate = useNavigate();

  // Mutations
  const createAgent = useCreateAgent({
    onSuccess: agent => {
      if (onSuccess) {
        onSuccess(agent);
      } else {
        navigate({ to: '/agents' });
      }
    },
  });

  const updateAgent = useUpdateAgent({
    optimistic: true,
    onSuccess: agent => {
      if (onSuccess) {
        onSuccess(agent);
      } else {
        navigate({ to: '/agent/$id', params: { id: agent.id } });
      }
    },
  });

  const mutation = mode === 'create' ? createAgent : updateAgent;
  const isPending = mutation.isPending;

  // Basic info state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Entrypoints state
  const [entrypoints, setEntrypoints] = useState<EntrypointFormData[]>([
    createEmptyEntrypoint(),
  ]);

  // Payments config state
  const [payments, setPayments] = useState<PaymentsFormData>({
    enabled: false,
    payTo: '',
    network: 'base-sepolia',
    facilitatorUrl: 'https://facilitator.daydreams.systems',
    storageType: 'sqlite',
    postgresConnectionString: '',
  });

  // Wallet config state
  const [wallet, setWallet] = useState<WalletFormData>({
    enabled: false,
    type: 'local',
    privateKey: '',
    secretKey: '',
    clientId: '',
    walletLabel: '',
    network: 'base-sepolia',
  });

  // A2A config state
  const [a2aEnabled, setA2aEnabled] = useState(false);

  // AP2 config state
  const [ap2, setAp2] = useState<AP2FormData>({
    enabled: false,
    roles: [],
    description: '',
    required: false,
  });

  // Analytics config state
  const [analytics, setAnalytics] = useState<AnalyticsFormData>({
    enabled: false,
  });

  // Identity config state
  const [identity, setIdentity] = useState<IdentityFormData>({
    enabled: false,
    network: 'base-sepolia',
    registryAddress: '',
    autoRegister: false,
    trustModels: ['feedback', 'inference-validation'],
    trustOverrides: {},
  });

  const [identityTrustOverridesExpanded, setIdentityTrustOverridesExpanded] =
    useState(false);

  // Populate form with initial data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setName(initialData.name);
      setSlug(initialData.slug);
      setDescription(initialData.description || '');
      setEnabled(initialData.enabled ?? true);
      setSlugManuallyEdited(true); // Don't auto-generate slug in edit mode

      if (initialData.entrypoints.length > 0) {
        setEntrypoints(initialData.entrypoints.map(entrypointFromApi));
      }

      setPayments(paymentsFromApi(initialData.paymentsConfig));
      setWallet(walletFromApi(initialData.walletsConfig));
      setA2aEnabled(initialData.a2aConfig?.enabled ?? false);
      setAp2(ap2FromApi(initialData.ap2Config));
      setAnalytics(analyticsFromApi(initialData.analyticsConfig));
      setIdentity(identityFromApi(initialData.identityConfig));
    }
  }, [mode, initialData]);

  // Handlers
  const handleSlugFromName = (newName: string) => {
    setName(newName);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setSlugManuallyEdited(true);
  };

  const addEntrypoint = () => {
    setEntrypoints([...entrypoints, createEmptyEntrypoint()]);
  };

  const removeEntrypoint = (id: string) => {
    if (entrypoints.length > 1) {
      setEntrypoints(entrypoints.filter(ep => ep.id !== id));
    }
  };

  const updateEntrypoint = (
    id: string,
    updates: Partial<EntrypointFormData>
  ) => {
    setEntrypoints(
      entrypoints.map(ep => (ep.id === id ? { ...ep, ...updates } : ep))
    );
  };

  // Build functions for API payload
  const buildEntrypoint = (ep: EntrypointFormData): SerializedEntrypoint => {
    const base: SerializedEntrypoint = {
      key: ep.key,
      description: ep.description || undefined,
      handlerType: ep.handlerType,
      handlerConfig: { name: 'echo' },
      price: ep.price || undefined,
      inputSchema: schemaFieldsToJsonSchema(ep.inputFields),
      outputSchema: schemaFieldsToJsonSchema(ep.outputFields),
    };

    switch (ep.handlerType) {
      case 'builtin':
        base.handlerConfig = { name: ep.builtinName };
        break;
      case 'js':
        base.handlerConfig = { code: ep.jsCode };
        break;
      case 'url':
        base.handlerConfig = {
          url: ep.urlEndpoint,
          method: ep.urlMethod,
          allowedHosts: [new URL(ep.urlEndpoint).host],
        };
        break;
    }

    return base;
  };

  const buildPaymentsConfig = (): PaymentsConfigWithStorage | undefined => {
    if (!payments.enabled || !payments.payTo) return undefined;
    const config: PaymentsConfigWithStorage = {
      payTo: payments.payTo,
      network: payments.network,
      facilitatorUrl: payments.facilitatorUrl,
    };

    // Add storage config if not default SQLite or if Postgres is selected
    if (payments.storageType === 'postgres') {
      if (!payments.postgresConnectionString?.trim()) {
        // Postgres selected but no connection string - validation will catch this
        return config;
      }
      config.storage = {
        type: 'postgres',
        postgres: {
          connectionString: payments.postgresConnectionString,
        },
      };
    } else {
      // SQLite is default, but we can explicitly set it
      config.storage = {
        type: 'sqlite',
      };
    }

    return config;
  };

  const buildWalletsConfig = (): WalletsConfig | undefined => {
    if (!wallet.enabled) return undefined;

    const agentWallet: WalletsConfig['agent'] = {
      type: wallet.type,
    };

    if (wallet.type === 'local' && wallet.privateKey) {
      agentWallet.privateKey = wallet.privateKey;
    } else if (wallet.type === 'thirdweb') {
      if (wallet.secretKey) agentWallet.secretKey = wallet.secretKey;
      if (wallet.clientId) agentWallet.clientId = wallet.clientId;
      if (wallet.walletLabel) agentWallet.walletLabel = wallet.walletLabel;
      // Derive chainId from network
      const networkOption = EVM_NETWORK_OPTIONS.find(
        opt => opt.value === wallet.network
      );
      if (networkOption) {
        agentWallet.chainId = networkOption.chainId;
      }
    }

    return { agent: agentWallet };
  };

  const buildA2aConfig = (): A2aConfig | undefined => {
    if (!a2aEnabled) return undefined;
    return { enabled: true };
  };

  const buildAP2Config = (): Ap2Config | undefined => {
    if (!ap2.enabled || ap2.roles.length === 0) return undefined;
    return {
      roles: ap2.roles as Ap2Config['roles'],
      description: ap2.description || undefined,
      required: ap2.required,
    };
  };

  const buildAnalyticsConfig = (): AnalyticsConfig | undefined => {
    if (!analytics.enabled) return undefined;
    return { enabled: true };
  };

  const buildIdentityConfig = (): IdentityConfig | undefined => {
    if (!identity.enabled) return undefined;
    // Get chainId from selected network
    const networkOption = EVM_NETWORK_OPTIONS.find(
      opt => opt.value === identity.network
    );
    const chainId = networkOption?.chainId || 84532;
    return {
      chainId,
      registryAddress: identity.registryAddress || undefined,
      autoRegister: identity.autoRegister,
      trustModels: identity.trustModels,
      trustOverrides:
        Object.keys(identity.trustOverrides).length > 0
          ? identity.trustOverrides
          : undefined,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Re-validate before submission (in case validation state is stale)
    const errors: string[] = [];
    if (!name.trim()) errors.push('Agent name is required');
    if (!slug.trim()) errors.push('Agent slug is required');
    entrypoints.forEach((ep, index) => {
      if (!ep.key.trim()) {
        errors.push(`Entrypoint ${index + 1}: Key is required`);
      }
      if (ep.handlerType === 'url' && !ep.urlEndpoint.trim()) {
        errors.push(
          `Entrypoint ${index + 1}: URL endpoint is required for URL handler`
        );
      }
      if (ep.handlerType === 'js' && !ep.jsCode.trim()) {
        errors.push(
          `Entrypoint ${index + 1}: JavaScript code is required for JS handler`
        );
      }
    });
    if (payments.enabled && !payments.payTo?.trim()) {
      errors.push('Payments: Wallet address (pay to) is required');
    }
    if (
      payments.enabled &&
      payments.storageType === 'postgres' &&
      !payments.postgresConnectionString?.trim()
    ) {
      errors.push(
        'Payments: PostgreSQL connection string is required when using PostgreSQL storage'
      );
    }
    if (wallet.enabled) {
      if (wallet.type === 'local' && !wallet.privateKey?.trim()) {
        errors.push('Wallet: Private key is required for local wallet');
      } else if (wallet.type === 'thirdweb') {
        if (!wallet.secretKey?.trim()) {
          errors.push('Wallet: Secret key is required for Thirdweb wallet');
        }
        if (!wallet.clientId?.trim()) {
          errors.push('Wallet: Client ID is required for Thirdweb wallet');
        }
        if (!wallet.walletLabel?.trim()) {
          errors.push('Wallet: Wallet label is required for Thirdweb wallet');
        }
      }
    }
    if (ap2.enabled && ap2.roles.length === 0) {
      errors.push('AP2: At least one role is required');
    }
    if (analytics.enabled && !payments.enabled) {
      errors.push('Analytics: Payments must be enabled');
    }
    if (identity.enabled && !wallet.enabled) {
      errors.push('Identity: Wallet must be enabled');
    }

    if (errors.length > 0) {
      // Validation failed - don't submit
      return;
    }

    const agentData: CreateAgent | UpdateAgent = {
      name,
      slug,
      description: description || undefined,
      entrypoints: entrypoints.map(buildEntrypoint),
      enabled,
      paymentsConfig: buildPaymentsConfig(),
      walletsConfig: buildWalletsConfig(),
      a2aConfig: buildA2aConfig(),
      ap2Config: buildAP2Config(),
      analyticsConfig: buildAnalyticsConfig(),
      identityConfig: buildIdentityConfig(),
    };

    if (mode === 'create') {
      createAgent.mutate({ body: agentData as CreateAgent });
    } else if (initialData) {
      updateAgent.mutate({
        path: { agentId: initialData.id },
        body: agentData as UpdateAgent,
      });
    }
  };

  // Validation state
  const validationErrors: string[] = [];

  if (!name.trim()) validationErrors.push('Agent name is required');
  if (!slug.trim()) validationErrors.push('Agent slug is required');

  entrypoints.forEach((ep, index) => {
    if (!ep.key.trim()) {
      validationErrors.push(`Entrypoint ${index + 1}: Key is required`);
    }
    if (ep.handlerType === 'url' && !ep.urlEndpoint.trim()) {
      validationErrors.push(
        `Entrypoint ${index + 1}: URL endpoint is required for URL handler`
      );
    }
    if (ep.handlerType === 'js' && !ep.jsCode.trim()) {
      validationErrors.push(
        `Entrypoint ${index + 1}: JavaScript code is required for JS handler`
      );
    }
  });

  // Payments validation
  if (payments.enabled) {
    if (!payments.payTo?.trim()) {
      validationErrors.push('Payments: Wallet address (pay to) is required');
    }
    if (
      payments.storageType === 'postgres' &&
      !payments.postgresConnectionString?.trim()
    ) {
      validationErrors.push(
        'Payments: PostgreSQL connection string is required when using PostgreSQL storage'
      );
    }
  }

  // Wallet validation
  if (wallet.enabled) {
    if (wallet.type === 'local' && !wallet.privateKey?.trim()) {
      validationErrors.push('Wallet: Private key is required for local wallet');
    } else if (wallet.type === 'thirdweb') {
      if (!wallet.secretKey?.trim()) {
        validationErrors.push(
          'Wallet: Secret key is required for Thirdweb wallet'
        );
      }
      if (!wallet.clientId?.trim()) {
        validationErrors.push(
          'Wallet: Client ID is required for Thirdweb wallet'
        );
      }
      if (!wallet.walletLabel?.trim()) {
        validationErrors.push(
          'Wallet: Wallet label is required for Thirdweb wallet'
        );
      }
    }
  }

  // Extension dependencies
  if (ap2.enabled && ap2.roles.length === 0) {
    validationErrors.push('AP2: At least one role is required');
  }
  if (analytics.enabled && !payments.enabled) {
    validationErrors.push('Analytics: Payments must be enabled');
  }
  if (identity.enabled && !wallet.enabled) {
    validationErrors.push('Identity: Wallet must be enabled');
  }

  const isValid = validationErrors.length === 0;

  const error = mutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Give your agent a name and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="My Agent"
                value={name}
                onChange={e => handleSlugFromName(e.target.value)}
                required
                className={!name.trim() ? 'border-destructive' : ''}
              />
              {!name.trim() && (
                <p className="text-destructive text-xs">Name is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="my-agent"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Lowercase letters, numbers, and hyphens only"
                required
                className={!slug.trim() ? 'border-destructive' : ''}
              />
              {!slug.trim() && (
                <p className="text-destructive text-xs">Slug is required</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this agent do?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Enabled</Label>
              <p className="text-muted-foreground text-xs">
                Agent can be invoked when enabled
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Entrypoints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Entrypoints</CardTitle>
            <CardDescription>
              Define how your agent can be invoked
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEntrypoint}
          >
            <Plus className="size-4" />
            Add Entrypoint
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {entrypoints.map((ep, index) => (
            <EntrypointForm
              key={ep.id}
              entrypoint={ep}
              index={index}
              canRemove={entrypoints.length > 1}
              onUpdate={updates => updateEntrypoint(ep.id, updates)}
              onRemove={() => removeEntrypoint(ep.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Payments Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Payments</CardTitle>
                <CardDescription>
                  Monetize your agent entrypoints
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={payments.enabled}
              onCheckedChange={checked => {
                setPayments(p => ({ ...p, enabled: checked }));
                // Auto-enable analytics when payments are enabled
                if (checked) {
                  setAnalytics(a => ({ ...a, enabled: true }));
                }
              }}
            />
          </div>
        </CardHeader>
        {payments.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payTo">
                Wallet Address (Pay To){' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payTo"
                placeholder="0x..."
                value={payments.payTo}
                onChange={e =>
                  setPayments(p => ({ ...p, payTo: e.target.value }))
                }
                className={!payments.payTo?.trim() ? 'border-destructive' : ''}
                required
              />
              {!payments.payTo?.trim() && (
                <p className="text-destructive text-xs">
                  Wallet address is required when payments are enabled
                </p>
              )}
              {payments.payTo?.trim() && (
                <p className="text-muted-foreground text-xs">
                  The wallet address that will receive payments
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Network</Label>
                <Select
                  value={payments.network}
                  onChange={e =>
                    setPayments(p => ({ ...p, network: e.target.value }))
                  }
                >
                  {NETWORK_OPTIONS.map(opt => (
                    <SelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectOption>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilitatorUrl">Facilitator URL</Label>
                <Input
                  id="facilitatorUrl"
                  placeholder="https://facilitator.daydreams.systems"
                  value={payments.facilitatorUrl}
                  onChange={e =>
                    setPayments(p => ({ ...p, facilitatorUrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Set prices on individual entrypoints above to enable paid
              invocations.
            </p>

            {/* Storage Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="storageType">Storage Backend</Label>
                <Select
                  id="storageType"
                  value={payments.storageType}
                  onChange={e =>
                    setPayments(p => ({
                      ...p,
                      storageType: e.target.value as 'sqlite' | 'postgres',
                    }))
                  }
                >
                  <SelectOption value="sqlite">SQLite (Automatic)</SelectOption>
                  <SelectOption value="postgres">PostgreSQL</SelectOption>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {payments.storageType === 'sqlite'
                    ? 'SQLite database is automatically created at .data/payments.db. No configuration needed.'
                    : 'PostgreSQL requires a connection string for external database storage.'}
                </p>
              </div>
              {payments.storageType === 'postgres' && (
                <div className="space-y-2">
                  <Label htmlFor="postgresConnectionString">
                    PostgreSQL Connection String{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="postgresConnectionString"
                    type="password"
                    placeholder="postgresql://user:pass@localhost:5432/dbname"
                    value={payments.postgresConnectionString}
                    onChange={e =>
                      setPayments(p => ({
                        ...p,
                        postgresConnectionString: e.target.value,
                      }))
                    }
                    className={
                      !payments.postgresConnectionString?.trim()
                        ? 'border-destructive'
                        : ''
                    }
                    required
                  />
                  {!payments.postgresConnectionString?.trim() && (
                    <p className="text-destructive text-xs">
                      Connection string is required for PostgreSQL storage
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Wallet Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Agent Wallet</CardTitle>
                <CardDescription>
                  Enable your agent to make payments
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={wallet.enabled}
              onCheckedChange={checked =>
                setWallet(w => ({ ...w, enabled: checked }))
              }
            />
          </div>
        </CardHeader>
        {wallet.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Wallet Type</Label>
              <Select
                value={wallet.type}
                onChange={e =>
                  setWallet(w => ({ ...w, type: e.target.value as WalletType }))
                }
              >
                <SelectOption value="local">Local (Private Key)</SelectOption>
                <SelectOption value="thirdweb">Thirdweb</SelectOption>
              </Select>
            </div>

            {wallet.type === 'local' && (
              <div className="space-y-2">
                <Label htmlFor="privateKey">
                  Private Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="privateKey"
                  type="password"
                  placeholder="0x..."
                  value={wallet.privateKey}
                  onChange={e =>
                    setWallet(w => ({ ...w, privateKey: e.target.value }))
                  }
                  className={
                    !wallet.privateKey?.trim() ? 'border-destructive' : ''
                  }
                  required
                />
                {!wallet.privateKey?.trim() && (
                  <p className="text-destructive text-xs">
                    Private key is required for local wallet
                  </p>
                )}
                {wallet.privateKey?.trim() && (
                  <p className="text-muted-foreground text-xs">
                    Warning: Store private keys securely. Consider using
                    environment variables in production.
                  </p>
                )}
              </div>
            )}

            {wallet.type === 'thirdweb' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">
                      Client ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientId"
                      placeholder="Your Thirdweb client ID"
                      value={wallet.clientId}
                      onChange={e =>
                        setWallet(w => ({ ...w, clientId: e.target.value }))
                      }
                      className={
                        !wallet.clientId?.trim() ? 'border-destructive' : ''
                      }
                      required
                    />
                    {!wallet.clientId?.trim() && (
                      <p className="text-destructive text-xs">
                        Client ID is required for Thirdweb wallet
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">
                      Secret Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="secretKey"
                      type="password"
                      placeholder="Your Thirdweb secret key"
                      value={wallet.secretKey}
                      onChange={e =>
                        setWallet(w => ({ ...w, secretKey: e.target.value }))
                      }
                      className={
                        !wallet.secretKey?.trim() ? 'border-destructive' : ''
                      }
                      required
                    />
                    {!wallet.secretKey?.trim() && (
                      <p className="text-destructive text-xs">
                        Secret key is required for Thirdweb wallet
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="walletLabel">
                      Wallet Label <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="walletLabel"
                      placeholder="my-agent-wallet"
                      value={wallet.walletLabel}
                      onChange={e =>
                        setWallet(w => ({ ...w, walletLabel: e.target.value }))
                      }
                      className={
                        !wallet.walletLabel?.trim() ? 'border-destructive' : ''
                      }
                      required
                    />
                    {!wallet.walletLabel?.trim() && (
                      <p className="text-destructive text-xs">
                        Wallet label is required for Thirdweb wallet
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="walletNetwork">Network</Label>
                    <Select
                      id="walletNetwork"
                      value={wallet.network}
                      onChange={e =>
                        setWallet(w => ({ ...w, network: e.target.value }))
                      }
                    >
                      {EVM_NETWORK_OPTIONS.map(opt => (
                        <SelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectOption>
                      ))}
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      EVM network for wallet operations (Chain ID:{' '}
                      {EVM_NETWORK_OPTIONS.find(
                        opt => opt.value === wallet.network
                      )?.chainId || 84532}
                      )
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* A2A Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Agent-to-Agent Protocol</CardTitle>
                <CardDescription>
                  Enable A2A protocol for agent interoperability
                </CardDescription>
              </div>
            </div>
            <Switch checked={a2aEnabled} onCheckedChange={setA2aEnabled} />
          </div>
        </CardHeader>
        {a2aEnabled && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your agent will expose a{' '}
              <code className="bg-muted px-1 rounded">
                /.well-known/agent.json
              </code>{' '}
              manifest and be discoverable by other A2A-compatible agents.
            </p>
          </CardContent>
        )}
      </Card>

      {/* AP2 Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>AP2 (Agent Payments Protocol)</CardTitle>
                <CardDescription>
                  Advertise payment roles for agent discovery
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={ap2.enabled}
              onCheckedChange={checked =>
                setAp2(a => ({ ...a, enabled: checked }))
              }
            />
          </div>
        </CardHeader>
        {ap2.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Roles</Label>
              <div className="space-y-2">
                {[
                  { value: 'merchant', label: 'Merchant' },
                  { value: 'shopper', label: 'Shopper' },
                  {
                    value: 'credentials-provider',
                    label: 'Credentials Provider',
                  },
                  { value: 'payment-processor', label: 'Payment Processor' },
                ].map(role => (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={ap2.roles.includes(role.value)}
                      onChange={e => {
                        if (e.target.checked) {
                          setAp2(a => ({
                            ...a,
                            roles: [...a.roles, role.value],
                          }));
                        } else {
                          setAp2(a => ({
                            ...a,
                            roles: a.roles.filter(r => r !== role.value),
                          }));
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
              {ap2.enabled && ap2.roles.length === 0 && (
                <p className="text-destructive text-xs">
                  At least one role is required
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap2Description">Description (Optional)</Label>
              <Input
                id="ap2Description"
                placeholder="Payment-enabled agent for e-commerce"
                value={ap2.description}
                onChange={e =>
                  setAp2(a => ({ ...a, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  id="ap2Required"
                  checked={ap2.required}
                  onChange={e =>
                    setAp2(a => ({ ...a, required: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <Label htmlFor="ap2Required" className="cursor-pointer">
                  Require AP2 support
                </Label>
              </div>
              <p className="text-muted-foreground text-xs pl-4">
                If checked, clients must support AP2 to interact with this
                agent. Defaults to true for merchants, false for other roles.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Analytics Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Track payment transactions and generate reports
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={analytics.enabled}
              disabled={!payments.enabled}
              onCheckedChange={checked =>
                setAnalytics(a => ({ ...a, enabled: checked }))
              }
            />
          </div>
        </CardHeader>
        {analytics.enabled && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Analytics tracks payment transactions. Requires payments to be
              enabled.
            </p>
            {!payments.enabled && (
              <p className="text-destructive text-xs mt-2">
                Enable payments to use analytics
              </p>
            )}
          </CardContent>
        )}
        {!payments.enabled && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Analytics requires payments to be enabled.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Identity Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>ERC-8004 Identity</CardTitle>
                <CardDescription>
                  On-chain agent identity and trust registration
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={identity.enabled}
              disabled={!wallet.enabled}
              onCheckedChange={checked =>
                setIdentity(i => ({ ...i, enabled: checked }))
              }
            />
          </div>
        </CardHeader>
        {identity.enabled && (
          <CardContent className="space-y-4">
            {!wallet.enabled && (
              <p className="text-destructive text-xs">
                Enable wallet to use identity
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="identityNetwork">Network</Label>
              <Select
                id="identityNetwork"
                value={identity.network}
                onChange={e =>
                  setIdentity(i => ({ ...i, network: e.target.value }))
                }
              >
                {EVM_NETWORK_OPTIONS.map(opt => (
                  <SelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectOption>
                ))}
              </Select>
              <p className="text-muted-foreground text-xs">
                EVM network for ERC-8004 registry (Chain ID:{' '}
                {EVM_NETWORK_OPTIONS.find(opt => opt.value === identity.network)
                  ?.chainId || 84532}
                )
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identityRegistryAddress">
                Registry Address (Optional)
              </Label>
              <Input
                id="identityRegistryAddress"
                placeholder="0x..."
                value={identity.registryAddress}
                onChange={e =>
                  setIdentity(i => ({
                    ...i,
                    registryAddress: e.target.value,
                  }))
                }
              />
              <p className="text-muted-foreground text-xs">
                ERC-8004 registry contract address (falls back to env/default)
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                id="identityAutoRegister"
                checked={identity.autoRegister}
                onChange={e =>
                  setIdentity(i => ({
                    ...i,
                    autoRegister: e.target.checked,
                  }))
                }
                className="rounded border-input"
              />
              <Label htmlFor="identityAutoRegister" className="cursor-pointer">
                Auto-register on creation
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Trust Models</Label>
              <div className="space-y-2">
                {[
                  {
                    value: 'feedback',
                    label: 'Feedback',
                    description: 'User feedback-based trust',
                  },
                  {
                    value: 'inference-validation',
                    label: 'Inference Validation',
                    description: 'Validation of agent outputs',
                  },
                  {
                    value: 'tee-attestation',
                    label: 'TEE Attestation',
                    description: 'Trusted execution environment attestation',
                  },
                ].map(model => (
                  <label
                    key={model.value}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={identity.trustModels.includes(model.value)}
                      onChange={e => {
                        if (e.target.checked) {
                          setIdentity(i => ({
                            ...i,
                            trustModels: [...i.trustModels, model.value],
                          }));
                        } else {
                          setIdentity(i => ({
                            ...i,
                            trustModels: i.trustModels.filter(
                              m => m !== model.value
                            ),
                          }));
                        }
                      }}
                      className="mt-1 rounded border-input"
                    />
                    <div>
                      <span className="text-sm font-medium">{model.label}</span>
                      <p className="text-muted-foreground text-xs">
                        {model.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setIdentityTrustOverridesExpanded(
                    !identityTrustOverridesExpanded
                  )
                }
                className="flex items-center justify-between w-full text-left"
              >
                <Label>Trust Overrides (Optional)</Label>
                {identityTrustOverridesExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {identityTrustOverridesExpanded && (
                <div className="space-y-3 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label htmlFor="validationRequestsUri">
                      Validation Requests URI
                    </Label>
                    <Input
                      id="validationRequestsUri"
                      type="url"
                      placeholder="https://example.com/validation-requests"
                      value={
                        identity.trustOverrides.validationRequestsUri || ''
                      }
                      onChange={e =>
                        setIdentity(i => ({
                          ...i,
                          trustOverrides: {
                            ...i.trustOverrides,
                            validationRequestsUri: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validationResponsesUri">
                      Validation Responses URI
                    </Label>
                    <Input
                      id="validationResponsesUri"
                      type="url"
                      placeholder="https://example.com/validation-responses"
                      value={
                        identity.trustOverrides.validationResponsesUri || ''
                      }
                      onChange={e =>
                        setIdentity(i => ({
                          ...i,
                          trustOverrides: {
                            ...i.trustOverrides,
                            validationResponsesUri: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedbackDataUri">Feedback Data URI</Label>
                    <Input
                      id="feedbackDataUri"
                      type="url"
                      placeholder="https://example.com/feedback-data"
                      value={identity.trustOverrides.feedbackDataUri || ''}
                      onChange={e =>
                        setIdentity(i => ({
                          ...i,
                          trustOverrides: {
                            ...i.trustOverrides,
                            feedbackDataUri: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Domain is automatically constructed from the server hostname
              during registration.
            </p>
          </CardContent>
        )}
        {!wallet.enabled && (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Identity requires wallet to be configured.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">
              Please fix the following errors:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: cancelPath })}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === 'create' ? 'Create Agent' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          <p className="font-medium">
            Failed to {mode === 'create' ? 'create' : 'update'} agent
          </p>
          <p>{error.error || String(error)}</p>
          {error.details && (
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Debug info */}
      {import.meta.env.DEV && (
        <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted rounded">
          <p>Mode: {mode}</p>
          <p>Form valid: {String(isValid)}</p>
          <p>Mutation status: {mutation.status}</p>
          <p>isPending: {String(isPending)}</p>
          <p>
            Name: "{name}" Slug: "{slug}"
          </p>
          <p>
            Entrypoints:{' '}
            {entrypoints.map(e => `${e.key || '(empty)'}`).join(', ')}
          </p>
        </div>
      )}
    </form>
  );
}

// ============================================================================
// EntrypointForm Component
// ============================================================================

interface EntrypointFormProps {
  entrypoint: EntrypointFormData;
  index: number;
  canRemove: boolean;
  onUpdate: (updates: Partial<EntrypointFormData>) => void;
  onRemove: () => void;
}

function EntrypointForm({
  entrypoint,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: EntrypointFormProps) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Entrypoint {index + 1}</h4>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Key <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="main"
            value={entrypoint.key}
            onChange={e => onUpdate({ key: e.target.value })}
            pattern="^[a-z0-9_-]+$"
            title="Lowercase letters, numbers, underscores, and hyphens only"
            required
            className={!entrypoint.key.trim() ? 'border-destructive' : ''}
          />
          {!entrypoint.key.trim() && (
            <p className="text-destructive text-xs">Key is required</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Handler Type</Label>
          <Select
            value={entrypoint.handlerType}
            onChange={e =>
              onUpdate({ handlerType: e.target.value as HandlerType })
            }
          >
            <SelectOption value="builtin">Built-in</SelectOption>
            <SelectOption value="js">JavaScript</SelectOption>
            <SelectOption value="url">URL (HTTP)</SelectOption>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          placeholder="What does this entrypoint do?"
          value={entrypoint.description}
          onChange={e => onUpdate({ description: e.target.value })}
        />
      </div>

      {/* Handler-specific config */}
      {entrypoint.handlerType === 'builtin' && (
        <div className="space-y-2">
          <Label>Built-in Handler</Label>
          <Select
            value={entrypoint.builtinName}
            onChange={e => onUpdate({ builtinName: e.target.value })}
          >
            <SelectOption value="echo">Echo (returns input)</SelectOption>
            <SelectOption value="passthrough">Passthrough</SelectOption>
          </Select>
        </div>
      )}

      {entrypoint.handlerType === 'js' && (
        <div className="space-y-2">
          <Label>
            JavaScript Code <span className="text-destructive">*</span>
          </Label>
          <Textarea
            placeholder="// Your code here"
            value={entrypoint.jsCode}
            onChange={e => onUpdate({ jsCode: e.target.value })}
            rows={6}
            className={`font-mono text-sm ${!entrypoint.jsCode.trim() ? 'border-destructive' : ''}`}
          />
          {!entrypoint.jsCode.trim() && (
            <p className="text-destructive text-xs">
              JavaScript code is required
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Access input via{' '}
            <code className="bg-muted px-1 rounded">ctx.input</code>. Return
            your output directly.
          </p>
        </div>
      )}

      {entrypoint.handlerType === 'url' && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={entrypoint.urlMethod}
              onChange={e =>
                onUpdate({ urlMethod: e.target.value as 'GET' | 'POST' })
              }
            >
              <SelectOption value="POST">POST</SelectOption>
              <SelectOption value="GET">GET</SelectOption>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>
              Endpoint URL <span className="text-destructive">*</span>
            </Label>
            <Input
              type="url"
              placeholder="https://api.example.com/webhook"
              value={entrypoint.urlEndpoint}
              onChange={e => onUpdate({ urlEndpoint: e.target.value })}
              required={entrypoint.handlerType === 'url'}
              className={
                !entrypoint.urlEndpoint.trim() ? 'border-destructive' : ''
              }
            />
            {!entrypoint.urlEndpoint.trim() && (
              <p className="text-destructive text-xs">
                URL endpoint is required
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input/Output Schemas */}
      <div className="space-y-4 pt-2 border-t">
        <SchemaFieldsEditor
          label="Input Fields"
          description="Define the expected input structure for this entrypoint"
          fields={entrypoint.inputFields}
          onChange={fields => onUpdate({ inputFields: fields })}
        />
        <SchemaFieldsEditor
          label="Output Fields"
          description="Define the expected output structure for this entrypoint"
          fields={entrypoint.outputFields}
          onChange={fields => onUpdate({ outputFields: fields })}
        />
      </div>

      {/* Pricing */}
      <div className="space-y-2 pt-2 border-t">
        <Label>Price (USD)</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">$</span>
          <Input
            type="text"
            placeholder="0.00 (free)"
            value={entrypoint.price}
            onChange={e => onUpdate({ price: e.target.value })}
            className="max-w-[150px]"
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Leave empty for free invocations. Requires Payments config enabled.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SchemaFieldsEditor Component
// ============================================================================

interface SchemaFieldsEditorProps {
  label: string;
  description: string;
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

const FIELD_TYPES: { value: SchemaField['type']; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
];

function SchemaFieldsEditor({
  label,
  description,
  fields,
  onChange,
}: SchemaFieldsEditorProps) {
  const addField = () => {
    onChange([...fields, createEmptySchemaField()]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    onChange(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>{label}</Label>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="size-3" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted-foreground text-xs italic py-2">
          No fields defined. Any input/output will be accepted.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map(field => (
            <div
              key={field.id}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
            >
              <div className="grid grid-cols-12 gap-2 flex-1">
                <div className="col-span-3">
                  <Input
                    placeholder="Field name"
                    value={field.name}
                    onChange={e =>
                      updateField(field.id, { name: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    value={field.type}
                    onChange={e =>
                      updateField(field.id, {
                        type: e.target.value as SchemaField['type'],
                      })
                    }
                    className="h-8 text-sm"
                  >
                    {FIELD_TYPES.map(t => (
                      <SelectOption key={t.value} value={t.value}>
                        {t.label}
                      </SelectOption>
                    ))}
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Description (optional)"
                    value={field.description}
                    onChange={e =>
                      updateField(field.id, { description: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e =>
                        updateField(field.id, { required: e.target.checked })
                      }
                      className="rounded border-input"
                    />
                    Required
                  </label>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
