import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "CreatorAgent — AI × Creator Economy",
  description: "One Agent. Full Creative Pipeline. From Topic to On-chain Publication. Powered by GLM-5.1.",
  keywords: ["Z.ai", "CreatorAgent", "AI", "Web3", "NFT", "GLM-5.1", "Hackathon"],
  authors: [{ name: "Z.AI Hackathon Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "CreatorAgent — AI × Creator Economy",
    description: "One Agent. Full Creative Pipeline. From Topic to On-chain Publication.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
