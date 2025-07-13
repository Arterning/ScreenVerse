"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Icons.logo className="h-6 w-6" />
            <span className="font-bold sm:inline-block">ScreenVerse</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between">
          <nav className="flex items-center space-x-4">
            <Link href="/recordings" className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline-block">我的录屏</span>
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
