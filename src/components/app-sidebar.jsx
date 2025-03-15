"use client"

import * as React from "react";
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
import { CircleHelp, FileVideo, Github, History, Home, Info, Upload, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { ToggleTheme } from "@/components/theme-toggle";

// This is sample data.
const data = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
      },
      {
        title: "Upload & Compress",
        url: "/upload",
        icon: Upload,
      },
      {
        title: "Video Library",
        url: "/library",
        icon: FileVideo,
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        title: "Batch Processing",
        url: "/batch",
        icon: Zap,
      },
      {
        title: "Download History",
        url: "/history",
        icon: History,
      },
    ],
  },
  {
    title: "Help & Resources",
    items: [
      {
        title: "About",
        url: "/about",
        icon: Info,
      },
      {
        title: "Documentation",
        url: "/docs",
        icon: CircleHelp,
      },
      {
        title: "GitHub Repository",
        url: "https://github.com/z3rsa/video-compressor",
        icon: Github,
        external: true,
      },
    ],
  },
];

export function AppSidebar({ ...props }) {
  const pathname = usePathname();

  const isActive = (url) => {
    return pathname === url || (url !== "/" && pathname.startsWith(url));
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader className="pb-0 mt-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/" className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mr-2">
                  <FileVideo className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Video Compressor</span>
                  <span className="text-xs text-muted-foreground">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Separator className="my-4" />
      <SidebarContent>
        {/* Iterate over the `data` array directly */}
        {data.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <a href={item.url}>
                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                        {item.title}
                      </a>
                    </SidebarMenuButton>

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