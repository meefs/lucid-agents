import { useState, useCallback, useEffect, useRef } from 'react';
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
  useLocation,
} from '@tanstack/react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SearchBar, type SearchFilter } from '@/components/search-bar';
import { ThemeProvider } from '@/providers/theme-provider';

import appCss from '../styles.css?url';

import type { QueryClient } from '@tanstack/react-query';
import { ModeToggle } from '@/components/mode-toggle';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>

        <Scripts />
      </body>
    </html>
  );
}
