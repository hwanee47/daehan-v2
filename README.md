# Daehan

Next.js + TypeScript, Tailwind CSS, shadcn/ui, Zustand, Supabase로 구성된 프로젝트입니다.

전역 기본 폰트는 프로젝트에 자체 호스팅된 Pretendard Variable입니다.

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 Supabase Dashboard의 Project URL과 Publishable Key를 입력하세요.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## 주요 경로

- `src/components/ui`: shadcn/ui 컴포넌트
- `src/lib/supabase/client.ts`: Client Component용 Supabase 클라이언트
- `src/lib/supabase/server.ts`: Server Component/Action용 Supabase 클라이언트
- `src/lib/supabase/storage.ts`: Storage 업로드, 삭제, 공개 URL 헬퍼
- `src/proxy.ts`: 인증 세션 쿠키 갱신
- `src/stores`: Zustand 전역 상태 저장소
- `src/components/layout`: 공통 레이아웃 및 반응형 컴포넌트
- `src/lib/responsive.ts`: TypeScript breakpoint와 media query 정의
- `src/hooks/use-media-query.ts`: 반응형 상태를 읽는 Client Component hook
- `AGENTS.md`: AI 코딩 에이전트 최상위 작업 규칙
- `docs/architecture.md`: 프로젝트 구조와 의존 방향
- `docs/design-system.md`: UI, 반응형과 접근성 기준
- `docs/agentic-development-workflow.md`: 작업 분류, 승인과 검증 흐름
- `docs/templates/work-template.md`: 표준 작업 문서 템플릿

Storage를 사용하려면 Supabase Dashboard에서 bucket을 생성하고 필요한 RLS 정책을 설정해야 합니다.

## 반응형 기준

Tailwind와 TypeScript에서 동일한 기준을 사용합니다.

| 이름 | 시작 너비 | 일반적인 용도 |
| --- | ---: | --- |
| `sm` | 640px | 큰 모바일/작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 노트북/데스크톱 |
| `xl` | 1280px | 큰 데스크톱 |
| `2xl` | 1536px | 와이드 화면 |

```tsx
import { Container } from "@/components/layout/container";
import { Responsive } from "@/components/layout/responsive";

<Container size="lg">
  <Responsive below="md">모바일 화면</Responsive>
  <Responsive from="md">태블릿 이상 화면</Responsive>
</Container>;
```

Client Component에서 화면 크기에 따른 동작이 꼭 필요한 경우에만 hook을 사용합니다. 단순 노출/배치는 Tailwind 또는 `Responsive` 컴포넌트를 우선 사용하세요.

```tsx
const isDesktop = useBreakpoint("lg");
```

## Zustand 사용 예시

```tsx
"use client";

import { useUiStore } from "@/stores/ui-store";

const isOpen = useUiStore((state) => state.isSidebarOpen);
const toggle = useUiStore((state) => state.toggleSidebar);
```
