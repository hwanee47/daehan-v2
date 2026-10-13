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

## 비밀번호 복구 설정

로그인 화면의 **비밀번호를 잊으셨나요?** 링크는 `/forgot-password`로 연결됩니다.
복구 메일의 링크를 검증하면 `/reset-password`에서 새 비밀번호를 설정할 수 있습니다.

배포 후 아래 설정을 함께 적용해야 합니다. Site URL 변경만으로 복구 기능이 완성되지 않습니다.

1. 배포 환경의 서버 전용 `SITE_URL`에 `https://실제도메인`을 설정합니다. 경로·쿼리 없이 origin만 입력합니다.
2. Supabase **Authentication → URL Configuration → Site URL**을 같은 origin으로 설정합니다. `/reset-password`를 Site URL에 붙이지 않습니다.
3. **Redirect URLs**에 `https://실제도메인/reset-password`를 추가합니다.
4. **Authentication → Email Templates → Reset Password**의 링크를 아래 형식으로 변경합니다. 앱과 Dashboard에서 발송하는 복구 메일 모두 이 템플릿을 사용합니다.

```html
<h2>비밀번호 재설정</h2>
<p>아래 링크에서 새 비밀번호를 설정해 주세요.</p>
<p><a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&amp;type=recovery">비밀번호 재설정하기</a></p>
<p>직접 요청하지 않았다면 이 메일을 무시해 주세요.</p>
```

`{{ .ConfirmationURL }}`을 사용하는 기존 템플릿 대신 위 TokenHash 링크를 사용해야 합니다.
`/auth/recovery`는 서버에서 `type=recovery` 토큰을 검증한 뒤 토큰 없는 주소로 이동합니다.
요청했던 브라우저와 다른 브라우저에서도 링크를 열 수 있으며, 기존 발송 메일 대신 설정 변경 후 새 메일로 확인하세요.
메일 보안 스캐너가 링크를 미리 방문하면 일회용 토큰이 소비될 수 있습니다. 이 경우 새 메일을 요청해야 합니다.

| 환경변수 | 공개 여부 | 누락·오류 시 동작 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | Supabase client 생성 실패 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 | Supabase client 생성 실패 |
| `SITE_URL` | 서버 전용 설정, 비밀값 아님 | 앱 복구 메일 요청을 차단하고 오류 안내. 운영 환경의 HTTP·localhost도 거부 |

`SITE_URL`은 자동으로 localhost로 대체되지 않습니다. 운영 메일 템플릿은 Supabase Site URL을 사용하므로 개발 환경에서도 같은 원격 프로젝트를 사용하면 메일은 운영 주소로 향합니다.
배포 도메인과 Supabase Site URL, 서버 `SITE_URL`을 일치시켜 주세요. 실제 환경변수 값은 저장소에 커밋하지 않습니다.

복구 세션은 일반 로그인과 분리된 HttpOnly 쿠키에 15분 동안 저장합니다. 일반 로그인만으로 복구 화면에서 비밀번호를 변경할 수 없습니다.
저장 시 서버가 복구 사용자를 다시 확인합니다. 성공 후 복구 세션을 로그아웃하고 복구 쿠키를 제거합니다.
다른 계정으로 로그인된 브라우저에서는 그 계정의 로그인 세션을 변경하지 않습니다.
Supabase의 비밀번호 정책·메일 발송 제한·토큰 만료 설정은 그대로 적용됩니다. DB migration과 Service Role Key는 필요하지 않습니다.

검증 명령: `node --test tests/password-recovery.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`.
테스트는 Supabase/Next.js 경계를 대체한 로컬 회귀 테스트입니다. 실제 메일 수신·링크 재사용·새 비밀번호 로그인은 별도 테스트 계정으로 확인해야 합니다.

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
