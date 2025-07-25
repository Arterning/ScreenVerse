"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Video, Settings } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export function AppHeader() {
  const { lang, setLang } = useLanguage();
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
            <Link href="/settings" className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline-block">设置</span>
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              aria-label="切换语言"
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
