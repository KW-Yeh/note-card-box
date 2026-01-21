import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">找不到此卡片</h1>
      <p className="text-muted-foreground text-center max-w-md">
        此卡片可能不存在、尚未公開，或已被作者取消分享。
      </p>
      <Button asChild>
        <Link href="/">返回首頁</Link>
      </Button>
    </div>
  );
}
