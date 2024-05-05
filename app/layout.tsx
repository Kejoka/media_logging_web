import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StyledEngineProvider } from "@mui/material";

const APP_NAME = "Media Logging";
const APP_DEFAULT_TITLE = "Media Logging PWA";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION = "Games, Movies, Shows, Book - All in One";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StyledEngineProvider injectFirst>
          <div className="flex w-screen h-screen overflow-x-hidden">
            {children}
          </div>
        </StyledEngineProvider>
      </body>
    </html>
  );
}