import { Database, FolderOpen, PanelsTopLeft } from "lucide-react";

export const homeContent = {
  brand: "DAEHAN",
  headline: "필요한 준비를\n한곳에서 끝내요",
  description:
    "프로젝트에 필요한 기술과 서비스를 연결하고 개발을 바로 시작할 수 있도록 도와드려요.",
  primaryAction: "프로젝트 연결하기",
  panelTitle: "기본 설정 3개",
  securityNote: "연결 정보는 안전하게 암호화되어 저장돼요.",
  setupItems: [
    { title: "Next.js", status: "준비됨", ready: true, icon: PanelsTopLeft },
    { title: "Supabase", status: "연결 필요", ready: false, icon: Database },
    { title: "Storage", status: "연결 필요", ready: false, icon: FolderOpen },
  ],
} as const;
