"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { initDB, type IDBPDatabase, type NoteCardBoxDB } from "@/lib/db";
import { migrateToUUID, isMigrationCompleted } from "@/lib/db/migrate-to-uuid";
import { toast } from "sonner";

interface DBContextValue {
	db: IDBPDatabase<NoteCardBoxDB> | null;
	isReady: boolean;
	error: Error | null;
	isMigrating: boolean;
}

const DBContext = createContext<DBContextValue>({
	db: null,
	isReady: false,
	error: null,
	isMigrating: false,
});

export function DBProvider({ children }: { children: ReactNode }) {
	const [db, setDb] = useState<IDBPDatabase<NoteCardBoxDB> | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [isMigrating, setIsMigrating] = useState(false);

	useEffect(() => {
		let mounted = true;

		initDB()
			.then(async (database) => {
				if (!mounted) return;

				// Check if UUID migration is needed
				if (!isMigrationCompleted()) {
					setIsMigrating(true);
					toast.info("正在更新資料格式，請稍候...", { duration: 3000 });

					const result = await migrateToUUID(database);

					if (result.success) {
						const totalMigrated =
							result.migratedTags + result.migratedCards + result.migratedLinks;
						if (totalMigrated > 0) {
							toast.success(
								`資料格式更新完成！已更新 ${totalMigrated} 筆資料`,
								{ duration: 5000 },
							);
						}
					} else {
						toast.error(`資料格式更新失敗：${result.error}`, {
							duration: 5000,
						});
					}

					setIsMigrating(false);
				}

				setDb(database);
				setIsReady(true);
			})
			.catch((err) => {
				if (mounted) {
					setError(err instanceof Error ? err : new Error(String(err)));
					setIsReady(true);
					setIsMigrating(false);
				}
			});

		return () => {
			mounted = false;
		};
	}, []);

	return (
		<DBContext.Provider value={{ db, isReady, error, isMigrating }}>
			{children}
		</DBContext.Provider>
	);
}

export function useDB() {
	const context = useContext(DBContext);
	if (context === undefined) {
		throw new Error("useDB must be used within a DBProvider");
	}
	return context;
}
