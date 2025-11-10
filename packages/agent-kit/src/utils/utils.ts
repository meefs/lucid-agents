import { z } from 'zod';

import { getActiveInstanceConfig, getAgentKitConfig } from '../config';
import type { PaymentsConfig } from '../types';

export function toJsonSchemaOrUndefined(s?: z.ZodTypeAny) {
  if (!s) return undefined;
  try {
    return z.toJSONSchema(s);
  } catch {
    return undefined;
  }
}

export function paymentsFromEnv(params?: {
  defaultPrice?: string;
}): PaymentsConfig {
  const activeInstanceConfig = getActiveInstanceConfig();
  const { payments } = getAgentKitConfig(activeInstanceConfig);
  return {
    payTo: payments.payTo,
    facilitatorUrl: payments.facilitatorUrl,
    network: payments.network,
    defaultPrice: params?.defaultPrice ?? payments.defaultPrice,
  };
}
