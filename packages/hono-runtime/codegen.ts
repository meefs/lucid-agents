import { createClient } from '@hey-api/openapi-ts';

await createClient({
  input: 'http://localhost:8787/doc',
  output: './sdk',
  plugins: ['@tanstack/react-query'],
});
