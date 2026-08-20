# 프런트엔드 아키텍처

## 1. 시스템 개요

Daehan은 Next.js 16 App Router 기반 웹 애플리케이션이다. Supabase가 데이터베이스, 인증과 파일 스토리지를 담당한다.

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| 클라이언트 상태 | Zustand |
| 백엔드 | Supabase Postgres/Auth/Storage |
| 폰트 | Pretendard Variable 자체 호스팅 |

## 2. 현재 구조

```text
src/
├── app/                    App Router, 전역 스타일과 폰트
├── components/
│   ├── ui/                 shadcn/ui primitive
│   └── layout/             공통 Container와 반응형 레이아웃
├── hooks/                  공통 클라이언트 훅
├── lib/
│   ├── supabase/           브라우저·서버 클라이언트와 Storage helper
│   ├── responsive.ts       breakpoint의 TypeScript 기준
│   └── utils.ts            공통 className 유틸리티
├── stores/                 Zustand 전역 UI 상태
└── proxy.ts                Supabase 인증 세션 쿠키 갱신
```

`@/*`는 `src/*`를 가리킨다.

## 3. 렌더링과 의존 방향

```text
Server page/layout
  -> feature component
  -> shared layout / shadcn UI

Client Component
  -> Server Action 또는 Route Handler
  -> server Supabase client
  -> Supabase
```

- 공통 UI가 특정 기능이나 라우트를 import하지 않는다.
- 서버 Supabase 모듈이 Client Component 또는 Zustand store에 의존하지 않는다.
- UI 컴포넌트가 인증 쿠키와 DB 응답 세부 구조를 직접 처리하지 않는다.
- 기능 전용 코드는 해당 route segment 가까이에 둔다.

## 4. 데이터와 인증

- Browser Client: `src/lib/supabase/client.ts`
- Server Client: `src/lib/supabase/server.ts`
- 인증 세션 갱신: `src/proxy.ts`
- 파일 공통 동작: `src/lib/supabase/storage.ts`

사용자 데이터 보호의 최종 경계는 Supabase RLS다. Client Component의 조건부 렌더링은 보안 정책을 대체하지 않는다. 스키마는 향후 `supabase/migrations`의 SQL migration으로 관리한다.

## 5. 상태 선택 기준

| 상태 | 위치 |
| --- | --- |
| 단일 컴포넌트 입력·열림 상태 | React 지역 상태 |
| 공유 가능한 URL 상태 | search params |
| 서버 데이터 | Server Component/Supabase query |
| 여러 화면의 클라이언트 UI | Zustand `src/stores` |
| 인증 세션 | Supabase Auth cookie |

## 6. 반응형

CSS와 TypeScript는 같은 breakpoint를 사용한다: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. 레이아웃 폭은 `Container`, 단순 표시 전환은 Tailwind 또는 `Responsive`, JavaScript 동작 분기가 꼭 필요한 경우만 `useBreakpoint`를 사용한다.

## 7. 문서 관리

이 문서는 합의된 구조를 설명한다. 일반 기능 작업 중 자동 수정하지 않으며, 최상위 라우트·인증·데이터 접근·상태 정책·공통 컴포넌트 계층이 바뀌는 경우 별도 문서 작업으로 갱신한다.
