"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	FileText,
	Lightbulb,
	BookOpen,
	FolderKanban,
	Link2,
	Network,
	Tags,
	ChevronRight,
	ChevronLeft,
	Sparkles,
	HelpCircle,
} from "lucide-react";

const ONBOARDING_KEY = "note-card-box-onboarding-completed";

interface OnboardingStep {
	title: string;
	description: string;
	content: React.ReactNode;
}

const steps: OnboardingStep[] = [
	{
		title: "歡迎使用卡片盒筆記",
		description: "讓我們來了解什麼是卡片盒筆記法",
		content: (
			<div className="space-y-4">
				<div className="rounded-lg bg-muted/50 p-4">
					<h4 className="mb-2 font-medium flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-yellow-500" />
						什麼是卡片盒筆記法？
					</h4>
					<p className="text-sm text-muted-foreground">
						卡片盒筆記法（Zettelkasten）是由德國社會學家 Niklas Luhmann
						發明的知識管理方法。 他用這套方法在學術生涯中發表了超過 70 本書和
						400 篇論文。
					</p>
				</div>
				<div className="rounded-lg bg-muted/50 p-4">
					<h4 className="mb-2 font-medium flex items-center gap-2">
						<HelpCircle className="h-4 w-4 text-blue-500" />
						核心理念
					</h4>
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li>
							• <strong>原子化筆記</strong>：每張卡片只記錄一個想法
						</li>
						<li>
							• <strong>用自己的話</strong>：用自己理解的方式重新表達
						</li>
						<li>
							• <strong>建立連結</strong>：將相關想法連接起來形成知識網絡
						</li>
						<li>
							• <strong>持續累積</strong>：讓知識隨時間複利成長
						</li>
					</ul>
				</div>
			</div>
		),
	},
	{
		title: "四種卡片類型",
		description: "根據內容性質選擇合適的卡片類型",
		content: (
			<div className="grid gap-3">
				<div className="flex items-start gap-3 rounded-lg border p-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900">
						<FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
					</div>
					<div>
						<h4 className="font-medium">永久筆記</h4>
						<p className="text-sm text-muted-foreground">
							經過深思熟慮、用自己的話表達的核心想法，是卡片盒的精華
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3 rounded-lg border p-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900">
						<Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" />
					</div>
					<div>
						<h4 className="font-medium">靈感筆記</h4>
						<p className="text-sm text-muted-foreground">
							隨時捕捉的靈光一閃，待後續整理歸納為永久筆記
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3 rounded-lg border p-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900">
						<BookOpen className="h-4 w-4 text-green-600 dark:text-green-300" />
					</div>
					<div>
						<h4 className="font-medium">文獻筆記</h4>
						<p className="text-sm text-muted-foreground">
							閱讀書籍、文章時的摘要和心得
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3 rounded-lg border p-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900">
						<FolderKanban className="h-4 w-4 text-purple-600 dark:text-purple-300" />
					</div>
					<div>
						<h4 className="font-medium">專案筆記</h4>
						<p className="text-sm text-muted-foreground">
							特定專案或主題的筆記集合
						</p>
					</div>
				</div>
			</div>
		),
	},
	{
		title: "建立連結與知識網絡",
		description: "卡片之間的連結是知識成長的關鍵",
		content: (
			<div className="space-y-4">
				<div className="flex items-start gap-3 rounded-lg border p-4">
					<Link2 className="mt-0.5 h-5 w-5 text-primary" />
					<div>
						<h4 className="font-medium">為什麼要建立連結？</h4>
						<p className="text-sm text-muted-foreground mt-1">
							當你將兩個想法連結在一起時，你就在創造新的洞見。
							隨著連結越來越多，你會發現意想不到的關聯。
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3 rounded-lg border p-4">
					<Network className="mt-0.5 h-5 w-5 text-primary" />
					<div>
						<h4 className="font-medium">知識圖譜</h4>
						<p className="text-sm text-muted-foreground mt-1">
							本系統提供視覺化的知識圖譜，讓你可以看見卡片之間的連結關係，
							發現知識的脈絡與結構。
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3 rounded-lg border p-4">
					<Tags className="mt-0.5 h-5 w-5 text-primary" />
					<div>
						<h4 className="font-medium">標籤系統</h4>
						<p className="text-sm text-muted-foreground mt-1">
							使用 #標籤 來分類你的筆記，讓相關主題的卡片更容易被找到。
							在編輯器中輸入 # 即可快速新增標籤。
						</p>
					</div>
				</div>
			</div>
		),
	},
	{
		title: "開始使用",
		description: "幾個簡單步驟，開始你的知識管理之旅",
		content: (
			<div className="space-y-4">
				<div className="rounded-lg bg-linear-to-r from-primary/10 to-primary/5 p-4">
					<h4 className="font-medium mb-3">建議的工作流程</h4>
					<ol className="space-y-3 text-sm">
						<li className="flex items-start gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
								1
							</span>
							<span>
								<strong>捕捉想法</strong>：有靈感時，立即建立一張「靈感筆記」
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
								2
							</span>
							<span>
								<strong>整理歸納</strong>
								：定期檢視靈感筆記，將有價值的想法轉為「永久筆記」
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
								3
							</span>
							<span>
								<strong>建立連結</strong>：思考新筆記與現有筆記的關聯，建立連結
							</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
								4
							</span>
							<span>
								<strong>探索知識</strong>：透過知識圖譜和標籤瀏覽，發現新的洞見
							</span>
						</li>
					</ol>
				</div>
				<div className="rounded-lg border border-dashed p-4 text-center">
					<p className="text-sm text-muted-foreground">
						準備好了嗎？點擊「開始使用」來建立你的第一張卡片！
					</p>
				</div>
			</div>
		),
	},
];

interface OnboardingDialogProps {
	forceOpen?: boolean;
	onComplete?: () => void;
}

export function OnboardingDialog({
	forceOpen,
	onComplete,
}: Readonly<OnboardingDialogProps>) {
	const [open, setOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);

	useEffect(() => {
		if (forceOpen) {
			queueMicrotask(() => {
				setOpen(true);
				setCurrentStep(0);
			});
			return;
		}

		// Check if user has completed onboarding
		const completed = localStorage.getItem(ONBOARDING_KEY);
		if (!completed) {
			queueMicrotask(() => setOpen(true));
		}
	}, [forceOpen]);

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleComplete = () => {
		localStorage.setItem(ONBOARDING_KEY, "true");
		setOpen(false);
		onComplete?.();
	};

	const handleSkip = () => {
		localStorage.setItem(ONBOARDING_KEY, "true");
		setOpen(false);
	};

	const step = steps[currentStep];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="sm:max-w-xl" showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>{step.title}</DialogTitle>
						<span className="text-sm text-muted-foreground">
							{currentStep + 1} / {steps.length}
						</span>
					</div>
					<DialogDescription>{step.description}</DialogDescription>
				</DialogHeader>

				<div className="py-4">{step.content}</div>

				{/* Progress indicators */}
				<div className="flex justify-center gap-1.5">
					{steps.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentStep(index)}
							className={`h-1.5 rounded-full transition-all ${
								index === currentStep
									? "w-6 bg-primary"
									: "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
							}`}
						/>
					))}
				</div>

				<DialogFooter className="flex-row justify-between sm:justify-between">
					<div>
						{currentStep === 0 ? (
							<Button variant="ghost" onClick={handleSkip}>
								略過
							</Button>
						) : (
							<Button variant="ghost" onClick={handlePrev}>
								<ChevronLeft className="mr-1 h-4 w-4" />
								上一步
							</Button>
						)}
					</div>
					<div>
						{currentStep < steps.length - 1 ? (
							<Button onClick={handleNext}>
								下一步
								<ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						) : (
							<Button onClick={handleComplete}>
								開始使用
								<Sparkles className="ml-1 h-4 w-4" />
							</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// Export the key for external use (e.g., reset onboarding)
export { ONBOARDING_KEY };
