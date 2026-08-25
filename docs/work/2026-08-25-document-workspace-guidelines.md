# 탭 작업영역 공식 지침 문서화

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

탭 유지, 분할 화면, 패널 기준 반응형과 독립 스크롤이 구현됐지만 현재 기준은 개별 작업 문서에 분산돼 있다. 앞으로 신규 업무 화면을 만들거나 기존 화면을 수정할 때 같은 구조와 검증 기준을 일관되게 적용하도록 공식 지침 문서에 역할별로 정리한다.

## 범위

### 포함

- `AGENTS.md`에 신규·수정 업무 화면의 필수 구현·검증 규칙 추가
- `docs/design-system.md`에 작업 패널 Container Query와 독립 스크롤 UI 기준 추가
- `docs/architecture.md`에 탭 수명, 분할 비율, 패널 반응형과 스크롤 소유권 구조 추가
- 기존 완료 작업 문서를 구현 근거와 이력으로 유지

### 제외

- 애플리케이션 코드 변경
- 기존 탭·분할·스크롤 동작 변경
- breakpoint 수치 변경
- 작업 문서 삭제 또는 통합
- DB 및 Supabase 변경

## 완료 조건

- [x] 신규 업무 화면이 직접 URL과 탭 패널 양쪽에서 동작해야 한다는 규칙이 명시된다.
- [x] 탭으로 열리는 업무 화면은 `@container/workspace`와 패널 너비 기준 반응형을 사용한다는 규칙이 명시된다.
- [x] Portal Dialog는 viewport 기준 반응형을 유지한다는 예외가 명시된다.
- [x] 각 패널이 독립적인 세로 스크롤을 소유하고 열린 동안 위치와 지역 상태가 유지된다는 구조가 명시된다.
- [x] 최대 5개 탭, 2분할, 25~75% 조절 범위와 접근 가능한 separator 규칙이 명시된다.
- [x] 신규·수정 화면 검증 항목에 최소·최대 분할 폭, overflow, 독립 스크롤과 Portal 잘림 확인이 포함된다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/layout.tsx`, `src/app/(app)/workspace-shell.tsx`, `src/app/(app)/workspace-panels.tsx`, `src/components/layout/app-tabs.tsx`, `src/stores/ui-store.ts`
- 관련 Supabase table/bucket: 해당 없음
- 재사용할 기존 패턴: 완료된 작업 문서 `2026-08-25-resizable-split-workspace.md`, `2026-08-25-workspace-container-responsive.md`, `2026-08-25-independent-workspace-panel-scroll.md`
- 문서와 구현의 차이: 공식 디자인·아키텍처 문서는 기존 viewport 반응형과 기본 탭 수명만 설명하며 패널별 반응형·스크롤·조절 가능한 분할 기준은 누락돼 있다.

## 설계

### UI와 반응형

- 모바일: 모바일은 단일 패널이며 업무 패널 내부 스크롤을 사용한다고 기록한다.
- 태블릿: `md` 이상에서 2분할을 제공하고 각 패널 폭으로 내부 반응형을 판단한다고 기록한다.
- 데스크톱: 25~75% 범위의 분할, 접근 가능한 separator와 패널별 독립 스크롤을 기록한다.
- 로딩/빈 상태/오류/권한: 기존 화면 상태 원칙을 유지하며 탭·분할 화면에서도 동일하게 처리한다고 기록한다.
- 접근성: separator 키보드 조절, Portal Dialog, overflow와 focus 흐름 검증을 명시한다.

### Server/Client 경계

- Server Component/Action: 작업영역 초기 데이터와 권한은 Server layout에서 준비한다는 기존 구조를 유지한다.
- Client Component/Zustand: 탭·분할 UI 상태는 Zustand, 탭별 입력·선택·스크롤은 마운트된 패널 DOM과 지역 상태가 소유한다고 명시한다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. 문서 변경만 원복하면 된다.

## 변경 계획

1. `docs/design-system.md` 반응형 절에 viewport와 workspace container의 선택 기준, breakpoint, Portal 예외와 패널 스크롤 원칙을 추가한다.
2. `AGENTS.md` 컴포넌트·스타일 및 검증 절에 신규·수정 업무 화면의 필수 구현과 분할 검증 규칙을 추가한다.
3. `docs/architecture.md` 현재 구조·상태·반응형 절에 탭 수명, 분할 상태, 패널별 container와 scroll ownership을 기록한다.
4. 세 문서의 용어와 수치가 실제 구현 및 완료 작업 문서와 일치하는지 검토하고 Markdown diff를 검증한다.

## 위험과 승인 사항

- 공식 지침은 앞으로의 모든 신규·수정 업무 화면에 적용되므로 현재 구현보다 넓은 정책 효력을 갖는다.
- 작업 문서는 세부 구현 이력, 공식 문서는 지속 규칙으로 구분하고 같은 설명을 과도하게 복제하지 않는다.
- 공통 컴포넌트 정책과 아키텍처 문서 변경이므로 이 제안에 대한 명시적 승인 후 반영한다.

## 검증 계획

- [ ] ESLint — 애플리케이션 코드 변경 없음으로 미실행
- [ ] TypeScript — 애플리케이션 코드 변경 없음으로 미실행
- [ ] 관련 단위/통합 테스트 — 해당 없음
- [x] 모바일 360px — 문서 기준 확인
- [x] 태블릿 768px — 문서 기준 확인
- [x] 데스크톱 1280px — 문서 기준 확인
- [x] 키보드와 접근성 — separator와 Portal 지침 확인
- [ ] Supabase 허용/거부 정책 — 해당 없음
- [ ] 프로덕션 빌드 — 문서 변경만으로 미실행 예정

## 결과

- 변경: `AGENTS.md`에 신규·수정 업무 화면의 강제 구현·검증 규칙, `docs/design-system.md`에 UI 기준, `docs/architecture.md`에 작업영역 구조와 상태·스크롤 소유권을 기록했다.
- 검증: 세 문서와 완료 작업 문서 및 실제 구현의 탭 수, 분할 범위, breakpoint, Portal 예외, scroll ownership 용어를 교차 확인했고 `git diff --check`를 통과했다.
- 미실행: 애플리케이션 코드 변경이 없어 ESLint, TypeScript와 프로덕션 빌드는 실행하지 않았다.
- 남은 위험/후속 작업: 없음
