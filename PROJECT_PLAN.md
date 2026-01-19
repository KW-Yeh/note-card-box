# Zettelkasten Note Card Box - 完整專案規劃

## 專案現況

- **框架**: Next.js 16 (App Router) + TypeScript
- **樣式**: Tailwind CSS v4 + 深色模式支援
- **字體**: Geist Sans/Mono
- **狀態**: 全新專案，尚未建立任何功能

## 確認的需求

- **用戶系統**: 登入為可選，本地編輯優先。只有需要同步帳號內容時才需登入（NextAuth.js + Google Provider）
- **資料儲存**: IndexedDB（前端儲存），登入後可同步至雲端
- **狀態管理**: React 原生（Context, useState, useRef）
- **元件庫**: shadcn/ui
- **分享功能**: 可透過連結分享卡片，訪客無需登入即可查看
- **搜尋功能**: 基本搜尋（標題和標籤）
- **版本歷史**: 不需要
- **響應式設計**: 從一開始就同步支援手機與桌面

---

## 一、技術棧與依賴套件

### 1.1 需安裝的依賴套件

```bash
# 編輯器
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-mention @tiptap/extension-character-count

# 圖形視覺化
pnpm add @xyflow/react

# IndexedDB 封裝（簡化操作）
pnpm add idb

# 表單驗證
pnpm add zod

# 日期處理
pnpm add date-fns

# ID 生成
pnpm add nanoid

# shadcn/ui 初始化（會自動安裝所需依賴）
pnpm dlx shadcn@latest init

# 驗證（可選，用於同步功能）
pnpm add next-auth
```

### 1.2 shadcn/ui 元件安裝

```bash
# 基礎元件
pnpm dlx shadcn@latest add button input textarea badge card dialog dropdown-menu tabs tooltip switch sheet drawer

# 額外元件（按需添加）
pnpm dlx shadcn@latest add command popover scroll-area separator skeleton toast
```

### 1.3 環境變數配置 (.env.local)

```env
NEXT_PUBLIC_APP_NAME="Note Card Box"

# NextAuth.js（可選，用於同步功能）
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"  # 需自行生成：openssl rand -base64 32
GOOGLE_CLIENT_ID="*****"
GOOGLE_CLIENT_SECRET="*****"
```

---

## 二、資料模型（IndexedDB Schema）

### 2.1 TypeScript 類型定義

```typescript
// types/card.ts

export type CardType = "PERMANENT" | "INNOVATION" | "LITERATURE" | "PROJECT";
export type RelationType = "EXTENSION" | "OPPOSITION";
export type CardStatus = "DRAFT" | "PENDING" | "ARCHIVED";

export interface Card {
	id: string; // nanoid 生成
	shareId: string; // 分享用的短 ID
	title: string; // 最多 100 字元
	content: string; // Markdown 內容
	type: CardType;
	status: CardStatus;
	isPublic: boolean; // 是否公開分享
	wordCount: number;
	tagIds: string[]; // 關聯的標籤 ID
	createdAt: number; // timestamp
	updatedAt: number;
	promotedAt?: number; // 轉化為永久卡片的時間
}

export interface Link {
	id: string;
	sourceId: string;
	targetId: string;
	relation: RelationType;
	description?: string;
	createdAt: number;
}

export interface Tag {
	id: string;
	name: string;
	color?: string; // Hex 色碼
	createdAt: number;
}
```

### 2.2 IndexedDB 設計

```typescript
// lib/db.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface NoteCardBoxDB extends DBSchema {
	cards: {
		key: string;
		value: Card;
		indexes: {
			"by-type": CardType;
			"by-status": CardStatus;
			"by-shareId": string;
			"by-createdAt": number;
		};
	};
	links: {
		key: string;
		value: Link;
		indexes: {
			"by-sourceId": string;
			"by-targetId": string;
		};
	};
	tags: {
		key: string;
		value: Tag;
		indexes: {
			"by-name": string;
		};
	};
}

export async function initDB(): Promise<IDBPDatabase<NoteCardBoxDB>> {
	return openDB<NoteCardBoxDB>("note-card-box", 1, {
		upgrade(db) {
			// Cards store
			const cardStore = db.createObjectStore("cards", { keyPath: "id" });
			cardStore.createIndex("by-type", "type");
			cardStore.createIndex("by-status", "status");
			cardStore.createIndex("by-shareId", "shareId", { unique: true });
			cardStore.createIndex("by-createdAt", "createdAt");

			// Links store
			const linkStore = db.createObjectStore("links", { keyPath: "id" });
			linkStore.createIndex("by-sourceId", "sourceId");
			linkStore.createIndex("by-targetId", "targetId");

			// Tags store
			const tagStore = db.createObjectStore("tags", { keyPath: "id" });
			tagStore.createIndex("by-name", "name", { unique: true });
		},
	});
}
```

---

## 三、專案結構規劃

```text
app/
├── (dashboard)/                 # 儀表板路由群組
│   ├── layout.tsx              # 儀表板共用佈局（含 Sidebar）
│   ├── page.tsx                # 首頁（四象限視圖）
│   ├── graph/
│   │   └── page.tsx            # 拓樸網路視圖
│   └── tags/
│       └── page.tsx            # 標籤瀏覽器
│
├── cards/
│   ├── page.tsx                # 卡片列表
│   ├── new/
│   │   └── page.tsx            # 新增卡片
│   └── [id]/
│       ├── page.tsx            # 檢視卡片
│       └── edit/
│           └── page.tsx        # 編輯卡片
│
├── share/
│   └── [shareId]/
│       └── page.tsx            # 公開分享頁面（訪客可見）
│
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts        # NextAuth.js API 路由（可選）
│
├── globals.css
├── layout.tsx
└── page.tsx                    # 直接顯示 dashboard（本地優先，無需登入）

components/
├── ui/                         # shadcn/ui 元件（自動生成）
│
├── cards/                      # 卡片相關元件
│   ├── card-item.tsx          # 單張卡片顯示
│   ├── card-grid.tsx          # 卡片網格
│   ├── card-type-badge.tsx    # 類型標籤
│   ├── card-status-banner.tsx # 待處理狀態橫幅
│   ├── promote-dialog.tsx     # 轉化確認對話框
│   └── share-toggle.tsx       # 分享開關
│
├── editor/                     # 編輯器元件
│   ├── tiptap-editor.tsx      # TipTap 編輯器封裝
│   ├── hashtag-suggestion.tsx # Hashtag 建議列表
│   ├── link-picker.tsx        # 連結選擇器
│   └── word-counter.tsx       # 字數計數器
│
├── graph/                      # 圖形視覺化元件
│   ├── knowledge-graph.tsx    # 主圖形元件
│   ├── graph-node.tsx         # 自訂節點
│   └── graph-controls.tsx     # 控制面板
│
├── layout/                     # 佈局元件
│   ├── sidebar.tsx            # 側邊欄
│   ├── header.tsx             # 頂部導航
│   ├── mobile-nav.tsx         # 手機版導航
│   └── side-panel.tsx         # 右側面板（卡片預覽）
│
└── dashboard/                  # 儀表板元件
    ├── quadrant-view.tsx      # 四象限視圖
    └── card-box-tile.tsx      # 單一卡片盒磚塊

contexts/
├── db-context.tsx             # IndexedDB 連線 Context
├── cards-context.tsx          # 卡片資料 Context
├── tags-context.tsx           # 標籤資料 Context
├── ui-context.tsx             # UI 狀態 Context（側邊欄、對話框）
└── auth-context.tsx           # 驗證狀態 Context（可選，用於同步）

lib/
├── db.ts                       # IndexedDB 初始化與操作
├── utils.ts                    # 工具函數（cn 等）
└── constants.ts                # 常數定義

hooks/
├── use-cards.ts               # 卡片 CRUD hooks
├── use-links.ts               # 連結 CRUD hooks
├── use-tags.ts                # 標籤 CRUD hooks
├── use-search.ts              # 搜尋 hook
└── use-media-query.ts         # RWD 偵測 hook

types/
├── card.ts                     # 卡片相關型別
├── link.ts                     # 連結相關型別
└── tag.ts                      # 標籤相關型別
```

---

## 四、React Context 狀態管理

### 4.1 DB Context

```typescript
// contexts/db-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IDBPDatabase } from 'idb';
import { initDB, NoteCardBoxDB } from '@/lib/db';

interface DBContextValue {
  db: IDBPDatabase<NoteCardBoxDB> | null;
  isReady: boolean;
}

const DBContext = createContext<DBContextValue>({ db: null, isReady: false });

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<IDBPDatabase<NoteCardBoxDB> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDB().then((database) => {
      setDb(database);
      setIsReady(true);
    });
  }, []);

  return (
    <DBContext.Provider value={{ db, isReady }}>
      {children}
    </DBContext.Provider>
  );
}

export const useDB = () => useContext(DBContext);
```

### 4.2 Cards Context

```typescript
// contexts/cards-context.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useDB } from './db-context';
import { Card, CardType } from '@/types/card';
import { nanoid } from 'nanoid';

interface CardsContextValue {
  cards: Card[];
  isLoading: boolean;
  fetchCards: (filters?: { type?: CardType }) => Promise<void>;
  getCard: (id: string) => Promise<Card | undefined>;
  createCard: (data: Omit<Card, 'id' | 'shareId' | 'createdAt' | 'updatedAt'>) => Promise<Card>;
  updateCard: (id: string, data: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  promoteCard: (id: string) => Promise<void>;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const { db, isReady } = useDB();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCards = useCallback(async (filters?: { type?: CardType }) => {
    if (!db) return;
    setIsLoading(true);

    let result: Card[];
    if (filters?.type) {
      result = await db.getAllFromIndex('cards', 'by-type', filters.type);
    } else {
      result = await db.getAll('cards');
    }

    setCards(result.sort((a, b) => b.updatedAt - a.updatedAt));
    setIsLoading(false);
  }, [db]);

  const createCard = useCallback(async (data: Omit<Card, 'id' | 'shareId' | 'createdAt' | 'updatedAt'>) => {
    if (!db) throw new Error('Database not ready');

    const now = Date.now();
    const card: Card = {
      ...data,
      id: nanoid(),
      shareId: nanoid(10),
      createdAt: now,
      updatedAt: now,
    };

    await db.put('cards', card);
    setCards(prev => [card, ...prev]);
    return card;
  }, [db]);

  // ... 其他方法

  return (
    <CardsContext.Provider value={{ cards, isLoading, fetchCards, getCard, createCard, updateCard, deleteCard, promoteCard }}>
      {children}
    </CardsContext.Provider>
  );
}

export const useCards = () => {
  const context = useContext(CardsContext);
  if (!context) throw new Error('useCards must be used within CardsProvider');
  return context;
};
```

---

## 五、核心功能規格

### 5.1 原子化編輯器

**TipTap 擴展配置：**

```typescript
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import CharacterCount from "@tiptap/extension-character-count";

const extensions = [
	StarterKit,
	Placeholder.configure({
		placeholder: "開始撰寫你的想法...",
	}),
	Mention.configure({
		HTMLAttributes: { class: "hashtag" },
		suggestion: hashtagSuggestion, // 自訂 hashtag 建議
	}),
	CharacterCount.configure({
		limit: 2000,
	}),
];
```

**字數限制邏輯：**

- 軟限制：500 字時顯示橘色警告
- 硬限制：2000 字時禁止繼續輸入
- 標題限制：最多 100 字元

### 5.2 智慧連結系統

**連結選擇器 UI 流程：**

1. 點擊「建立連結」按鈕
2. 彈出 Dialog，包含：
   - 搜尋框（即時搜尋永久卡片）
   - 篩選器（依標籤篩選）
   - 連結類型選擇（EXTENSION / OPPOSITION）
   - 連結說明輸入框（選填）
3. 確認後在編輯器下方顯示已連結的卡片

**推薦演算法（IndexedDB 版本）：**

```typescript
async function suggestRelatedCards(
	db: IDBPDatabase,
	currentCard: Card,
): Promise<Card[]> {
	const allPermanentCards = await db.getAllFromIndex(
		"cards",
		"by-type",
		"PERMANENT",
	);

	return allPermanentCards
		.filter((card) => card.id !== currentCard.id)
		.map((card) => ({
			...card,
			score: card.tagIds.filter((tagId) => currentCard.tagIds.includes(tagId))
				.length,
		}))
		.filter((card) => card.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);
}
```

### 5.3 卡片轉化工作流

**轉化邏輯：**

```typescript
async function promoteCard(db: IDBPDatabase, cardId: string): Promise<void> {
	const card = await db.get("cards", cardId);
	if (!card) throw new Error("卡片不存在");

	// 檢查連結
	const linksFrom = await db.getAllFromIndex("links", "by-sourceId", cardId);
	const linksTo = await db.getAllFromIndex("links", "by-targetId", cardId);

	if (linksFrom.length + linksTo.length === 0) {
		throw new Error("請先建立與現有知識的聯繫（延伸或對立），再進行歸納。");
	}

	if (card.type === "PERMANENT") {
		throw new Error("此卡片已是永久卡片。");
	}

	await db.put("cards", {
		...card,
		type: "PERMANENT",
		status: "ARCHIVED",
		promotedAt: Date.now(),
		updatedAt: Date.now(),
	});
}
```

### 5.4 分享功能

**注意：** 由於使用 IndexedDB（純前端儲存），分享功能需要後端支援才能讓訪客查看。目前的實作方式：

1. **階段一（純前端）**：分享連結複製後，訪客打開會看到「此功能需要後端支援」的提示
2. **階段二（加入後端）**：當卡片設為公開時，同步至後端資料庫，訪客可透過 API 取得卡片內容

### 5.5 驗證與同步（可選）

**本地優先原則：**

- 用戶開啟應用後可直接使用，無需登入
- 所有資料儲存在 IndexedDB
- 只有當用戶想要跨裝置同步時，才需要登入

**NextAuth.js 配置（Google Provider）：**

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		}),
	],
});
```

**同步流程（未來實作）：**

1. 用戶點擊「同步」按鈕
2. 如未登入，彈出 Google 登入
3. 登入後，將 IndexedDB 資料同步至雲端
4. 在其他裝置登入後，可拉取雲端資料

---

## 六、UI/UX 詳細規格

### 6.1 四象限儀表板

**佈局結構：**

```text
┌─────────────────────────────────────────┐
│                 Header                  │
├────────┬────────────────────────────────┤
│        │  ┌──────────┬──────────┐       │
│        │  │  創新    │  文獻    │       │
│ Sidebar│  │ (黃色)   │ (藍色)   │       │
│        │  ├──────────┼──────────┤       │
│        │  │  專案    │  永久    │       │
│        │  │ (綠色)   │ (紫色)   │       │
│        │  └──────────┴──────────┘       │
└────────┴────────────────────────────────┘
```

**卡片盒磚塊顯示資訊：**

- 卡片盒名稱 + 圖示
- 總卡片數量
- 本週新增數量
- 最近更新時間
- 點擊進入該類型的卡片列表

### 6.2 拓樸網路視圖

**React Flow 節點配置：**

```typescript
const nodeColors = {
	PERMANENT: "#8B5CF6", // 紫色
	INNOVATION: "#F59E0B", // 黃色
	LITERATURE: "#3B82F6", // 藍色
	PROJECT: "#10B981", // 綠色
};

const edgeStyles = {
	EXTENSION: {
		stroke: "#6B7280",
		strokeDasharray: undefined,
		markerEnd: { type: MarkerType.ArrowClosed },
	},
	OPPOSITION: {
		stroke: "#EF4444",
		strokeDasharray: "5,5",
		markerEnd: { type: MarkerType.ArrowClosed },
	},
};
```

**互動功能：**

- 滑鼠懸停：顯示卡片標題 Tooltip
- 單擊節點：右側面板/底部抽屜顯示卡片詳情
- 雙擊節點：進入卡片編輯頁
- 拖曳節點：重新排列佈局
- 滾輪縮放：調整視圖比例
- 篩選器：依卡片類型/標籤篩選顯示

### 6.3 標籤瀏覽器

**多標籤交集搜尋（IndexedDB 版本）：**

```typescript
async function searchByTags(
	db: IDBPDatabase,
	tagIds: string[],
): Promise<Card[]> {
	const allCards = await db.getAll("cards");

	return allCards
		.filter((card) => tagIds.every((tagId) => card.tagIds.includes(tagId)))
		.sort((a, b) => b.updatedAt - a.updatedAt);
}
```

---

## 七、RWD 響應式設計規範

### 7.1 斷點設定

```css
/* Tailwind 預設斷點 */
sm: 640px   /* 小型平板 */
md: 768px   /* 平板 */
lg: 1024px  /* 筆電 */
xl: 1280px  /* 桌面 */
```

### 7.2 各視圖 RWD 策略

**儀表板（四象限視圖）：**

- 桌面：2x2 網格
- 平板：2x2 網格（縮小間距）
- 手機：1 欄垂直排列

**拓樸網路視圖：**

- 桌面：全螢幕圖形 + 右側 Sheet
- 手機：全螢幕圖形，點擊節點彈出底部 Drawer

**標籤瀏覽器：**

- 桌面：左側標籤列表 + 右側卡片瀑布流
- 手機：標籤以水平捲動 Badge 顯示，下方卡片單欄

**卡片編輯器：**

- 桌面：雙欄（左編輯、右連結選擇）
- 手機：單欄，連結選擇改為全螢幕 Dialog

**側邊欄：**

- 桌面：固定顯示（可收合）
- 手機：漢堡選單觸發的 Sheet

### 7.3 觸控優化

- 按鈕最小高度：44px（iOS 建議）
- 可點擊元素間距：至少 8px
- 長按支援：卡片長按顯示快速操作選單

---

## 八、實作順序建議

### Phase 1：基礎建設

1. 初始化 shadcn/ui
2. 安裝所有依賴套件
3. 建立 IndexedDB 連線與 Context
4. 建立專案資料夾結構

### Phase 2：核心 CRUD

1. 實作 Cards Context（CRUD 操作）
2. 實作 Tags Context
3. 建立卡片列表頁面
4. 建立卡片編輯頁面（基礎版）

### Phase 3：編輯器強化

1. 整合 TipTap 編輯器
2. 實作 Hashtag 自動偵測
3. 實作字數計數與限制
4. 實作連結選擇器

### Phase 4：連結系統

1. 實作 Links Context
2. 實作連結推薦演算法
3. 實作轉化工作流（Promote）
4. 建立轉化確認 Dialog

### Phase 5：視覺化

1. 整合 React Flow
2. 實作拓樸網路視圖
3. 實作節點點擊預覽
4. 實作篩選功能

### Phase 6：儀表板與瀏覽

1. 建立四象限視圖
2. 建立標籤瀏覽器
3. 實作多標籤交集搜尋
4. 優化 RWD 響應式設計

### Phase 7：驗證與同步（可選）

1. 設定 NextAuth.js + Google Provider
2. 在 Header 加入「登入/同步」按鈕
3. 實作分享開關 UI（Switch + 複製連結）
4. 顯示「需後端支援」提示
5. （未來）建立後端 API 同步公開卡片與用戶資料

---

## 九、驗證方式

### 功能測試清單

- [ ] 可以建立各類型卡片（永久/創新/文獻/專案）
- [ ] 編輯器可正確偵測 #hashtag 並關聯標籤
- [ ] 字數超過 500 字時顯示警告
- [ ] 可以搜尋並連結永久卡片
- [ ] 非永久卡片顯示「待處理」橫幅
- [ ] 無連結時無法轉化為永久卡片
- [ ] 有連結時可成功轉化為永久卡片
- [ ] 拓樸視圖正確顯示節點與連線
- [ ] 點擊節點可在側邊面板預覽
- [ ] 標籤瀏覽器支援多標籤交集搜尋
- [ ] 四象限儀表板顯示正確統計數據
- [ ] RWD：手機版側邊欄以 Sheet 呈現
- [ ] RWD：手機版圖形視圖使用 Drawer 顯示詳情

### E2E 測試場景

1. **完整工作流測試**：
   建立創新卡片 → 加入標籤 → 搜尋永久卡片 → 建立連結 → 轉化為永久卡片

2. **拓樸視圖測試**：
   建立多張卡片 → 建立多種連結 → 驗證圖形顯示正確

3. **RWD 測試**：
   在不同螢幕尺寸下驗證佈局正確切換
