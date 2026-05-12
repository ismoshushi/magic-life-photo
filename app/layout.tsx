import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫画人生 | LifeManga",
  description: "把生活照片转换成漫画页的 Web/Vercel 复刻版"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
