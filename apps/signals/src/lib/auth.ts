import { betterAuth } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

export const auth = betterAuth({
  //...your config
  plugins: [tanstackStartCookies()], // make sure this is the last plugin in the array
});
