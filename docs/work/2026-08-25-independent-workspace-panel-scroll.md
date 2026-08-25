# 작업영역 패널별 독립 스크롤

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

현재 2분할 패널은 문서 전체의 세로 스크롤을 공유한다. 좌우 패널의 콘텐츠 길이가 다를 때 한쪽을 스크롤하면 다른 화면의 위치도 함께 이동하므로 비교 작업이 어렵다. 헤더와 탭을 고정된 앱 chrome으로 두고 각 업무 패널이 남은 작업영역 안에서 독립적으로 스크롤하도록 변경한다.

## 범위

### 포함

- 앱 레이아웃을 화면 높이의 `header + tabs + workspace` flex 구조로 변경
- 분할 화면의 좌우 패널에 각각 독립적인 세로 스크롤 적용
- 단일 탭 화면도 동일한 작업영역 내부 스크롤 사용
- 탭 전환과 분할 해제·재활성화 시 각 마운트된 탭의 스크롤 위치 유지
- 전체화면에서 탭 아래 남은 높이를 자동으로 사용
- 스크롤 체이닝을 줄이는 overscroll 처리

### 제외

- 스크롤 위치를 localStorage나 서버에 영구 저장
- 탭을 닫았다 다시 열었을 때 이전 스크롤 복원
- AG Grid 내부 스크롤 방식 변경
- 모바일에서 2분할 제공
- DB 및 Supabase 변경

## 완료 조건

- [x] 분할 화면에서 좌측 패널을 스크롤해도 우측 패널 위치가 바뀌지 않는다.
- [x] 우측 패널도 좌측과 독립적으로 스크롤된다.
- [x] 헤더와 탭은 패널 스크롤 중 화면에 유지된다.
- [x] 단일 탭과 직접 URL 화면도 탭 아래 작업영역 안에서 정상적으로 스크롤된다.
- [x] 탭 전환 후 돌아오면 닫지 않은 탭의 스크롤 위치가 유지된다.
- [x] 전체화면에서도 패널 스크롤 높이가 화면에 맞는다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/layout.tsx`, `src/app/(app)/workspace-shell.tsx`, `src/components/layout/app-header.tsx`, `src/components/layout/app-tabs.tsx`
- 관련 Supabase table/bucket: 해당 없음
- 재사용할 기존 패턴: 열린 패널을 닫을 때까지 마운트하는 `WorkspaceShell` 구조
- 문서와 구현의 차이: 현재 아키텍처 문서는 탭 패널 수명과 분할만 설명하고 스크롤 소유권은 정의하지 않는다.

## 설계

### UI와 반응형

- 모바일: 단일 패널이 탭 아래 남은 높이에서 세로 스크롤된다.
- 태블릿: 기존 `md` 이상 분할 조건을 유지하며 두 패널이 독립적으로 스크롤된다.
- 데스크톱: 좌우 패널은 같은 작업영역 높이를 사용하고 각자 scrollbar를 가진다.
- 로딩/빈 상태/오류/권한: 기존 패널 콘텐츠와 상태를 그대로 유지한다.
- 접근성: 키보드 Page Up/Down, Home/End 및 wheel/touch 스크롤이 포커스된 패널에서 동작하도록 native overflow container를 사용한다.

### Server/Client 경계

- Server Component/Action: `(app)` layout의 높이·flex 구조만 변경한다.
- Client Component/Zustand: `WorkspaceShell`이 각 마운트된 panel section의 overflow를 소유하며 새 전역 상태는 추가하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. flex 높이와 overflow class를 제거하면 원복 가능하다.

## 변경 계획

1. `(app)` layout을 `h-svh` 세로 flex로 만들고 header는 고정, workspace root는 `min-h-0 flex-1`로 설정한다.
2. workspace root 안에서 탭 바는 고정하고 `WorkspaceShell`이 남은 높이를 차지하게 한다.
3. 각 visible panel section에 `h-full overflow-y-auto overscroll-contain`을 적용한다.
4. 직접 URL과 홈 콘텐츠도 동일한 내부 스크롤 영역에서 동작하도록 fallback children wrapper를 조정한다.
5. 단일·분할·전체화면과 탭 전환 시 스크롤 위치를 검증한다.

## 위험과 승인 사항

- 브라우저 문서 스크롤 대신 앱 내부 스크롤로 바뀌므로 `(app)` 그룹의 홈·프로필·직접 URL 화면도 스크롤 컨테이너 안에서 동작한다.
- 열린 패널 DOM을 유지하므로 탭별 `scrollTop`은 자연스럽게 보존되지만 탭을 닫으면 함께 제거된다.
- 공통 레이아웃의 스크롤 소유권을 변경하는 Standard 작업이므로 이 제안에 대한 명시적 승인 후 구현한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [x] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — 해당 없음
- [x] 프로덕션 빌드

## 결과

- 변경: `(app)` 레이아웃을 화면 높이 flex 구조로 전환하고 header와 tabs를 고정 영역으로 유지했다. fallback 화면과 각 마운트된 업무 panel section에 독립적인 native 세로 스크롤을 적용했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `git diff --check`, `npx next build --webpack` 통과
- 미실행: 로컬 개발 서버가 실행 중이지 않아 실제 wheel, touch, 키보드 Page Up/Down과 전체화면 수동 검증은 수행하지 못했다.
- 남은 위험/후속 작업: 실제 브라우저에서 OS별 scrollbar 폭과 AG Grid 내부 스크롤 중첩 감각을 확인할 수 있다.
