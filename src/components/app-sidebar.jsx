"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ToggleTheme } from "@/components/theme-toggle";
import {
  CircleHelp,
  FileVideo,
  Github,
  History,
  Home,
  Info,
  Upload,
  Zap,
  ImageMinus,
} from "lucide-react";

const data = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Upload & Compress", url: "/upload", icon: Upload },
      { title: "Video Library", url: "/library", icon: FileVideo },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "Batch Processing", url: "/batch", icon: Zap },
      { title: "Remove Background", url: "/remove-bg", icon: ImageMinus },
      { title: "Download History", url: "/history", icon: History },
    ],
  },
  {
    title: "Help & Resources",
    items: [
      { title: "About", url: "/about", icon: Info },
      { title: "Documentation", url: "/docs", icon: CircleHelp },
      {
        title: "GitHub Repository",
        url: "https://github.com/z3rsa/z3rtools", // updated name
        icon: Github,
        external: true,
      },
    ],
  },
];

export function AppSidebar(props) {
  const pathname = usePathname();
  const isActive = (url) => pathname === url || (url !== "/" && pathname.startsWith(url));

  return (
    <Sidebar {...props}>
      <SidebarHeader className="pb-0 mt-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mr-2">
                  <FileVideo className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Z3RTools</span>
                  <span className="text-xs text-muted-foreground">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Separator className="my-4" />
      <SidebarContent>
        {data.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.external ? (
                      <SidebarMenuButton asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                          {item.title}
                        </a>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link href={item.url}>
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <Separator />
        <ToggleTheme />
      </SidebarContent>
    </Sidebar>
  );
}
