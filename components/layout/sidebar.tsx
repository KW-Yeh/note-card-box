"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	FileText,
	Network,
	Tags,
	Plus,
	ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUI } from "@/contexts";

const navItems = [
	{ href: "/", label: "儀表板", icon: LayoutDashboard },
	{ href: "/cards", label: "所有卡片", icon: FileText },
	{ href: "/graph", label: "知識圖譜", icon: Network },
	{ href: "/tags", label: "標籤瀏覽", icon: Tags },
];

export function Sidebar() {
	const pathname = usePathname();
	const { sidebarOpen, toggleSidebar, isMobile } = useUI();

	if (isMobile) return null;

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 overflow-hidden",
				sidebarOpen ? "w-64" : "w-16",
			)}
		>
			<div className="flex h-full flex-col w-64">
				{/* Header */}
				<div className="flex h-16 items-center border-b px-4">
					<Link
						href="/"
						className={cn(
							"text-lg font-semibold whitespace-nowrap overflow-hidden transition-all duration-300",
							sidebarOpen ? "w-auto opacity-100 mr-auto" : "w-0 opacity-0",
						)}
					>
						Note Card Box
					</Link>
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleSidebar}
						className="shrink-0"
					>
						<ChevronLeft
							className={cn(
								"h-5 w-5 transition-transform",
								!sidebarOpen && "rotate-180",
							)}
						/>
					</Button>
				</div>

				{/* New Card Button */}
				<div className={cn("p-4", sidebarOpen ? "w-64" : "w-16")}>
					<Button
						asChild
						className={cn(
							"w-full transition-all flex items-center",
							sidebarOpen ? "justify-start gap-2" : "justify-center gap-0",
						)}
					>
						<Link href="/cards/new">
							<Plus className="h-4 w-4 shrink-0" />
							<span
								className={cn(
									"whitespace-nowrap overflow-hidden transition-all duration-300",
									sidebarOpen
										? "w-auto opacity-100 visible"
										: "w-0 opacity-0 invisible",
								)}
							>
								新增卡片
							</span>
						</Link>
					</Button>
				</div>

				{/* Navigation */}
				<nav
					className={cn("flex-1 space-y-1 px-2", sidebarOpen ? "w-64" : "w-16")}
				>
					{navItems.map((item) => {
						const isActive =
							pathname === item.href ||
							(item.href !== "/" && pathname.startsWith(item.href));

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
									"hover:bg-accent hover:text-accent-foreground",
									isActive
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground",
									sidebarOpen ? "justify-start gap-3" : "justify-center",
								)}
							>
								<item.icon className="h-5 w-5 shrink-0" />
								<span
									className={cn(
										"whitespace-nowrap overflow-hidden transition-all duration-300",
										sidebarOpen
											? "w-auto opacity-100 visible"
											: "w-0 opacity-0 invisible",
									)}
								>
									{item.label}
								</span>
							</Link>
						);
					})}
				</nav>

				{/* Footer */}
				<div className="border-t p-4 overflow-hidden">
					<p
						className={cn(
							"text-xs text-muted-foreground whitespace-nowrap transition-all duration-300",
							sidebarOpen
								? "w-auto opacity-100 visible"
								: "w-0 opacity-0 invisible",
						)}
					>
						Zettelkasten 知識管理
					</p>
				</div>
			</div>
		</aside>
	);
}
