# AGENTS.md

이 문서는 Daehan 프로젝트에서 작업하는 AI 코딩 에이전트가 따라야 할 최상위 지침이다. 저장소 전체에 적용하며, 하위 경로의 `AGENTS.md`가 더 구체적인 규칙을 정의하면 해당 문서를 우선한다.

## 1. 프로젝트 개요

- Next.js 16 App Router, React 19, TypeScript 애플리케이션이다.
- npm을 패키지 관리자로 사용한다.
- Tailwind CSS 4, shadcn/ui, Zustand, Supabase를 사용한다.
- Supabase가 데이터베이스, 인증과 파일 스토리지를 담당한다.
- Server Component 우선, 명확한 서버·클라이언트 경계와 작은 변경 범위를 기본 원칙으로 한다.

## 2. 작업 전 확인

### 필수 시작 게이트

새 작업 요청을 받으면 다른 skill, 플러그인 또는 도메인별 workflow를 선택하기 전에 반드시 다음 순서로 시작한다.

1. 이 `AGENTS.md`와 `docs/agentic-development-workflow.md`를 읽는다.
2. 요청을 Small, Standard, Architecture, Data migration 중 하나로 분류한다.
3. 작업 성격에 맞는 기준 문서, 템플릿과 실제 인접 코드를 읽는다.
4. Standard 이상이면 `docs/work/` 작업 문서를 반드시 `제안` 단계로 만들고 사용자에게 공유한다. 단, DB 작업은 승인 전 파일을 만들지 않고 대화에 제안 초안을 작성한다.
5. Standard, Architecture, Data migration은 최초 작업 요청과 별개인 사용자의 명시적 승인 응답을 반드시 받은 뒤 `승인` 단계로 전환한다. 최초 요청에 “만들어줘”, “구현해줘”가 포함돼도 제안 내용에 대한 승인으로 간주하지 않는다.
6. 승인된 범위와 요구사항을 확인한 뒤에만 `진행` 단계로 전환하고 설계안 생성, 구현, 작업 문서 외 파일 수정, 개발 서버 실행 또는 외부 시스템 변경을 시작한다.

1~4단계를 완료하기 전에는 구현을 전제로 한 질문, 시각안 생성, 파일 생성·수정, 개발 서버 실행을 시작하지 않는다. Standard 이상은 5단계의 명시적 승인 전까지 작업 문서 작성과 읽기 전용 조사만 허용한다. skill이나 플러그인 지침이 별도 workflow를 요구해도 이 저장소의 시작 게이트와 승인 흐름을 먼저 적용하고, 충돌하면 저장소 지침을 우선한다.

작업 성격에 맞는 다음 문서와 실제 코드를 확인한다.

- 구조와 의존 규칙: `docs/architecture.md`
- 테이블과 공통 감사 컬럼 규칙: `docs/database-conventions.md`
- UI, 반응형과 접근성 기준: `docs/design-system.md`
- 작업 문서와 승인 흐름: `docs/agentic-development-workflow.md`
- 신규 작업 문서 템플릿: `docs/templates/work-template.md`
- 설치와 환경변수: `README.md`, `.env.example`
- 실행 명령과 의존성: `package.json`
- Next.js 변경 사항: `node_modules/next/dist/docs/`의 관련 문서
- 변경 대상과 인접한 `page.tsx`, `layout.tsx`, `actions.ts`, `components/`

문서와 구현이 다르면 추측으로 구조를 변경하지 않는다. 실제 설정과 호출부를 확인하고 불일치가 작업에 영향을 주면 결과에 보고한다.

## 3. 기본 작업 원칙

- 요청 범위만 수정하고 관련 없는 리팩터링이나 전체 포맷 변경을 섞지 않는다.
- 새 구현 전에 같은 역할의 기존 패턴과 shadcn/ui 컴포넌트를 찾는다.
- 기존 공개 URL, 컴포넌트 API, DB 스키마와 환경변수 의미를 승인 없이 변경하지 않는다.
- 사용자의 기존 변경과 미추적 파일을 보존한다.
- `node_modules`, `.next`, 생성 파일과 외부 라이브러리 코드를 직접 수정하지 않는다.
- 비밀키, 서비스 역할 키, 인증 토큰, 실제 사용자 데이터를 코드·로그·문서에 기록하지 않는다.
- 기술 부채는 요청 범위 밖에서 함께 수정하지 않고 별도로 보고한다.

## 4. Next.js와 컴포넌트 경계

- Server Component를 기본으로 사용한다.
- 이벤트, 브라우저 API, React 상태·효과 또는 Zustand가 필요한 가장 작은 경계에만 `'use client'`를 선언한다.
- 데이터 변경은 Server Action 또는 Route Handler 같은 서버 경계에서 수행한다.
- 서버 전용 Supabase 클라이언트를 Client Component에서 import하지 않는다.
- `window`, `document`, storage는 Client Component나 클라이언트 전용 훅에서만 사용한다.
- Next.js 코드를 변경하기 전 현재 버전의 관련 가이드를 `node_modules/next/dist/docs/`에서 읽는다.

## 5. 컴포넌트와 스타일

- shadcn/ui primitive는 `src/components/ui`에 둔다.
- 앱 공통 레이아웃은 `src/components/layout`, 기타 공통 컴포넌트는 역할별 `src/components/*`에 둔다.
- 한 기능에서만 쓰는 컴포넌트, 타입과 유틸리티는 해당 라우트 가까이에 둔다.
- 기본 스타일은 Tailwind CSS를 사용하고 전역 CSS는 토큰·폰트·기본 스타일에 한정한다.
- class 조합에는 `cn`을 사용한다.
- 색상은 shadcn CSS variable 기반 semantic token을 우선한다.
- 전역 기본 폰트는 Pretendard Variable과 `font-sans`다.
- 제품 UI와 카피는 `docs/design-system.md`의 Daehan 디자인 언어를 따른다. 신규·수정 UI 요청에도 같은 토큰, 단일 blue 강조, 평면 surface, 해요체 원칙을 기본 적용한다. 입력 계열은 `rounded-sm`, AG Grid는 radius 없음을 기본으로 하고 나머지 컴포넌트는 디자인 시스템의 radius 기준을 따른다.
- Toss의 시각 원칙만 차용하며 Toss 브랜드, 로고, 금융 제품 구조나 전용 내비게이션은 복제하지 않는다.
- 반응형은 `src/lib/responsive.ts`의 `sm`, `md`, `lg`, `xl`, `2xl` 기준을 사용한다.
- 페이지 폭과 좌우 여백은 `Container`, 단순 노출 전환은 Tailwind 또는 `Responsive`를 우선한다.
- 임의 breakpoint를 반복해서 만들지 않는다. 새 전역 기준이 필요하면 문서와 CSS/TypeScript 정의를 함께 검토한다.
- 접근 가능한 HTML, label, 키보드 조작과 aria 속성을 유지한다.

## 6. Supabase와 데이터 접근

- 브라우저는 `src/lib/supabase/client.ts`, 서버는 `src/lib/supabase/server.ts`를 사용한다.
- Service Role Key는 브라우저 코드와 `NEXT_PUBLIC_` 환경변수에 절대 사용하지 않는다.
- 테이블·컬럼·제약·인덱스·RLS·DB 함수·trigger·Storage 정책을 새로 만들거나 변경하는 모든 DB 작업은 구현 전에 사용자 승인을 받는다.
- 승인 전에는 기존 구조 조사, 영향 범위, 제안 스키마, RLS, migration 및 rollback 계획만 제시한다. 로컬 migration SQL 작성, 타입 생성, 애플리케이션 코드 변경도 시작하지 않는다.
- 사용자의 최초 기능 요청은 DB 설계·migration 구현 승인으로 간주하지 않는다. 제안 내용을 명시적으로 설명한 뒤 별도의 승인 응답을 받아야 한다.
- 요청한 컬럼이나 인증 구조를 보안 또는 설계상의 이유로 바꾸려면 변경 이유와 대안을 먼저 제시하고 사용자의 선택을 받는다.
- 이 프로젝트는 로컬 Supabase 인스턴스를 구성하지 않는다. 승인된 migration은 연결된 원격 `daehan` 프로젝트를 대상으로 dry run 후 적용하고, migration 기록과 최신 상태를 재검증한다.
- 인증 사용자 데이터가 있는 테이블은 기본적으로 RLS를 활성화하고 최소 권한 정책을 명시한다.
- 스키마 변경은 재현 가능한 SQL migration으로 관리한다. Dashboard에서만 수동 변경하고 끝내지 않는다.
- 테이블에는 목적에 맞는 PK, FK, `created_at`, 필요한 인덱스와 삭제 정책을 검토한다.
- Storage bucket에는 공개 여부, 파일 경로 규칙, 크기·MIME 제한과 RLS 정책을 함께 정의한다.
- DB 타입을 생성하면 수동 타입과 중복시키지 않고 Supabase client generic에 연결한다.
- 오류를 숨기지 말고 사용자 메시지와 서버 로그에 필요한 경계를 구분한다.

## 7. 상태 관리

- 한 컴포넌트의 임시 UI 상태는 React 지역 상태를 사용한다.
- URL로 복원되어야 하는 검색·필터·페이지는 search params를 사용한다.
- 서버 데이터는 Server Component 또는 Supabase query 결과를 기준으로 하며 Zustand에 중복 저장하지 않는다.
- 여러 화면이 공유하는 클라이언트 UI 상태에만 `src/stores`의 Zustand store를 사용한다.
- 인증 토큰, 비밀번호와 민감정보를 Zustand나 브라우저 storage에 저장하지 않는다.
- persist middleware를 사용할 때 hydration 전후 UI와 저장 데이터 버전을 명시적으로 처리한다.
- 파생 가능한 값은 별도 상태로 복제하지 않는다.

## 8. 환경과 보안

- `NEXT_PUBLIC_` 환경변수는 공개 정보로 간주한다.
- `.env.local`과 실제 키 값을 커밋하거나 출력하지 않는다.
- 환경변수를 추가하면 `.env.example`과 README에 이름, 공개 여부와 누락 시 동작을 기록한다.
- 사용자 입력은 서버에서 다시 검증하며 클라이언트 검증을 보안 경계로 보지 않는다.
- 권한은 UI 노출 여부가 아니라 Supabase RLS와 서버 검증으로 보장한다.

## 9. 검증

완료 전 변경 위험에 비례해 다음을 수행한다.

1. 변경 파일과 인접 호출부를 검토한다.
2. `npm run lint`로 정적 오류를 확인한다.
3. `npx tsc --noEmit`으로 타입을 확인한다.
4. 필요하면 `npx next build --webpack`으로 프로덕션 빌드를 확인한다.
5. UI 변경은 모바일, 태블릿, 데스크톱 viewport와 키보드 흐름을 확인한다.
6. DB 변경은 migration, RLS, 허용/거부 케이스와 rollback 가능성을 확인한다.

실행하지 못한 검증, 기존 실패와 남은 위험은 결과에 명시한다.

## 10. 완료 기준

- 요청 동작이 구현되고 범위를 벗어난 변경이 없다.
- Server/Client 경계와 의존 방향이 지켜졌다.
- 로딩, 빈 상태, 오류, 권한과 반응형 동작을 변경 범위에 맞게 처리했다.
- Supabase 변경에는 RLS와 Storage 정책을 포함한 재현 가능한 migration이 있다.
- 가능한 lint, typecheck, 테스트 또는 빌드를 수행했다.
- 중요한 구조 결정은 작업 문서 또는 별도 ADR 후보로 기록했다.

## 11. 문서 변경

- 일반 기능 변경 중 `docs/architecture.md`를 자동 수정하지 않는다.
- 아키텍처, 인증, 데이터 접근, 상태 관리 또는 공통 컴포넌트 정책을 바꾸는 작업은 사용자와 합의 후 별도 문서 변경으로 다룬다.
- 신규 작업 문서는 `docs/templates/work-template.md`의 필수 항목을 유지한다. 해당 없는 항목은 `해당 없음`과 근거를 적는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
