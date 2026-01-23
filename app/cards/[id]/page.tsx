"use client";

import { CardStatusBanner } from "@/components/cards/card-status-banner";
import { CardTypeBadge } from "@/components/cards/card-type-badge";
import { ShareDialog } from "@/components/cards/share-dialog";
import { Header } from "@/components/layout/header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCards, useDB, useLinks, useSession, useTags } from "@/contexts";
import {
	type Card,
	type Link as LinkType,
	RELATION_TYPE_LABELS,
} from "@/types/card";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
	ArrowLeft,
	Link as LinkIcon,
	Pencil,
	Share2,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default function CardDetailPage({ params }: PageProps) {
	const { id } = use(params);
	const router = useRouter();
	const { isReady } = useDB();
	const { getCard, updateCard, deleteCard, promoteCard } = useCards();
	const { tags, fetchTags } = useTags();
	const { getLinksForCard } = useLinks();
	const { data: session } = useSession();

	const [card, setCard] = useState<Card | null>(null);
	const [cardLinks, setCardLinks] = useState<{
		from: LinkType[];
		to: LinkType[];
	}>({
		from: [],
		to: [],
	});
	const [linkedCards, setLinkedCards] = useState<Card[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

	const isSynced = !!session?.user?.id;

	useEffect(() => {
		if (isReady) {
			fetchTags();
			loadCard();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isReady, id]);

	const loadCard = async () => {
		setIsLoading(true);
		try {
			const cardData = await getCard(id);
			if (cardData) {
				setCard(cardData);
				const links = await getLinksForCard(id);
				setCardLinks(links);

				// Load linked cards
				const linkedCardIds = [
					...links.from.map((l) => l.targetId),
					...links.to.map((l) => l.sourceId),
				];
				const linkedCardsData = await Promise.all(
					linkedCardIds.map((linkedId) => getCard(linkedId)),
				);
				setLinkedCards(
					linkedCardsData.filter((c): c is Card => c !== undefined),
				);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteCard(id);
			toast.success("卡片已刪除");
			router.push("/cards");
		} catch {
			toast.error("刪除失敗");
		}
	};

	const handlePromote = async () => {
		try {
			const promoted = await promoteCard(id);
			setCard(promoted);
			toast.success("卡片已歸納為永久卡片");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "歸納失敗");
		}
	};

	const handleTogglePublic = async (isPublic: boolean) => {
		if (!card) return;

		const response = await fetch(`/api/cards/${card.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isPublic, updatedAt: Date.now() }),
		});

		if (!response.ok) {
			throw new Error("更新失敗");
		}

		const updated = await updateCard(card.id, { isPublic });
		setCard(updated);
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">載入中...</p>
			</div>
		);
	}

	if (!card) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">找不到此卡片</p>
				<Button asChild>
					<Link href="/cards">返回列表</Link>
				</Button>
			</div>
		);
	}

	const cardTags = tags.filter((tag) => card.tagIds.includes(tag.id));
	const totalLinks = cardLinks.from.length + cardLinks.to.length;

	return (
		<div className="flex flex-col">
			<Header title="檢視卡片" />

			<div className="flex-1 p-4 md:p-6">
				<div className="mx-auto max-w-3xl space-y-6">
					{/* Back Button */}
					<Button variant="ghost" size="sm" asChild>
						<Link href="/cards">
							<ArrowLeft className="mr-2 h-4 w-4" />
							返回列表
						</Link>
					</Button>

					{/* Status Banner */}
					<CardStatusBanner card={card} onPromote={handlePromote} />

					{/* Card Header */}
					<div className="space-y-4 flex flex-col">
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<CardTypeBadge type={card.type} />
									{card.isPublic && <Badge variant="secondary">公開</Badge>}
								</div>
							</div>

							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsShareDialogOpen(true)}
								>
									<Share2 className="mr-2 h-4 w-4" />
									分享
								</Button>

								<Button variant="outline" size="sm" asChild>
									<Link href={`/cards/${id}/edit`}>
										<Pencil className="mr-2 h-4 w-4" />
										編輯
									</Link>
								</Button>

								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
											<AlertDialogDescription>
												此操作無法復原。卡片及其關聯的連結都將被刪除。
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>取消</AlertDialogCancel>
											<AlertDialogAction onClick={handleDelete}>
												刪除
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>

						<h1 className="text-2xl font-bold">{card.title || "無標題"}</h1>

						{/* Meta Info */}
						<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
							<span>
								建立於 {format(card.createdAt, "yyyy/MM/dd", { locale: zhTW })}
							</span>
							<span>
								更新於{" "}
								{formatDistanceToNow(card.updatedAt, {
									addSuffix: true,
									locale: zhTW,
								})}
							</span>
							<span>{card.wordCount} 字</span>
						</div>
					</div>

					{/* Tags */}
					{cardTags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{cardTags.map((tag) => (
								<Badge
									key={tag.id}
									variant="secondary"
									style={{
										backgroundColor: tag.color ? `${tag.color}20` : undefined,
									}}
								>
									#{tag.name}
								</Badge>
							))}
						</div>
					)}

					{/* Content */}
					<div
						className="prose prose-sm dark:prose-invert max-w-none max-h-[70vh] rounded-lg border bg-card p-6"
						dangerouslySetInnerHTML={{
							__html:
								card.content || '<p class="text-muted-foreground">無內容</p>',
						}}
					/>

					{/* Linked Cards */}
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<LinkIcon className="h-5 w-5" />
							<h2 className="text-lg font-semibold">關聯卡片 ({totalLinks})</h2>
						</div>

						{totalLinks === 0 ? (
							<p className="text-sm text-muted-foreground">尚未建立任何連結</p>
						) : (
							<div className="space-y-2">
								{cardLinks.from.map((link) => {
									const linkedCard = linkedCards.find(
										(c) => c.id === link.targetId,
									);
									if (!linkedCard) return null;

									return (
										<Link
											key={link.id}
											href={`/cards/${linkedCard.id}`}
											className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
										>
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="text-xs">
													{RELATION_TYPE_LABELS[link.relation]}
												</Badge>
												<span className="font-medium">{linkedCard.title}</span>
											</div>
											<CardTypeBadge type={linkedCard.type} />
										</Link>
									);
								})}
								{cardLinks.to.map((link) => {
									const linkedCard = linkedCards.find(
										(c) => c.id === link.sourceId,
									);
									if (!linkedCard) return null;

									return (
										<Link
											key={link.id}
											href={`/cards/${linkedCard.id}`}
											className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
										>
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="text-xs">
													被{RELATION_TYPE_LABELS[link.relation]}
												</Badge>
												<span className="font-medium">{linkedCard.title}</span>
											</div>
											<CardTypeBadge type={linkedCard.type} />
										</Link>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			{card && (
				<ShareDialog
					card={card}
					open={isShareDialogOpen}
					onOpenChange={setIsShareDialogOpen}
					onTogglePublic={handleTogglePublic}
					isSynced={isSynced}
				/>
			)}
		</div>
	);
}
