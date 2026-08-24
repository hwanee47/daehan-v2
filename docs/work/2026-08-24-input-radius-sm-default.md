# 입력 컴포넌트 radius 기본값 정리

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 "승인"으로 명시적으로 승인함 / 2026-08-24

## 배경과 목적

입력 컴포넌트가 화면별로 `rounded-2xl`, `rounded-xl`, `rounded-sm`을 직접 사용해 일관성이 없다. 앞으로 새로 만들거나 수정하는 입력 계열 컴포넌트는 `rounded-sm`을 기본으로 사용하고, 현재 주요 폼도 같은 기준으로 맞춘다. 데이터 grid는 모서리 radius 없이 표시한다.

## 범위

### 포함

- 디자인 시스템에 input, textarea, select 등 입력 필드의 기본 radius를 `rounded-sm`으로 명시
- 로그인과 회원가입 입력 필드를 `rounded-sm`으로 변경
- 코드관리 입력 필드의 현재 `rounded-sm` 적용 상태 확인
- 코드관리의 코드그룹·코드디테일 AG Grid와 검사성적서 AG Grid 외곽 radius 제거
- 향후 입력 UI 구현 시 해당 기준을 따르도록 저장소 개발 지침 정리

### 제외

- 버튼, 카드, dialog, 메뉴, badge와 상태 메시지의 radius 변경
- Tailwind 전역 `--radius` 토큰 변경
- 신규 공통 Input primitive 도입 또는 기존 폼 구조 리팩터링
- 데이터베이스와 인증 동작 변경

## 완료 조건

- [x] 입력 계열의 기본 radius가 문서에서 `rounded-sm`으로 정의되어 있다.
- [x] 로그인, 회원가입과 코드관리의 사용자 입력 필드가 `rounded-sm`을 사용한다.
- [x] AG Grid 외곽 컨테이너가 radius 없이 표시된다.
- [x] 버튼과 surface 계열의 기존 radius는 유지된다.
- [x] ESLint와 TypeScript 검사가 통과한다.

## 현재 구현 조사

- 관련 route/component: `src/app/login/login-form.tsx`, `src/app/signup/signup-form.tsx`, `src/app/reference-information/codes/code-management.tsx`, `src/app/inspection-reports/inspection-reports-grid.tsx`
- 관련 Supabase table/bucket: 해당 없음. 스타일만 변경한다.
- 재사용할 기존 패턴: 코드관리 화면의 `rounded-sm` 입력 클래스
- 문서와 구현의 차이: `docs/design-system.md`는 전체적으로 12~28px의 큰 radius를 권장하지만, 사용자는 입력 계열에 더 작은 `rounded-sm`을 기본값으로 요청했다. 공통 Input primitive가 없어 화면별 클래스에 직접 반영해야 한다. 현재 세 개의 AG Grid 외곽 컨테이너는 `rounded-2xl`을 사용한다.

## 설계

### UI와 반응형

- 모바일: 입력 필드의 크기와 간격은 유지하고 radius만 변경한다.
- 태블릿: 동일하다.
- 데스크톱: 동일하다.
- 로딩/빈 상태/오류/권한: 기존 동작과 스타일을 유지한다.
- 접근성: label, aria 속성, focus ring과 최소 높이를 유지한다.

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 폼의 client 경계와 상태 처리를 변경하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. 클래스와 문서 변경을 되돌리면 된다.

## 변경 계획

1. `docs/design-system.md`와 `AGENTS.md`에 입력 계열은 `rounded-sm`, AG Grid는 radius 없음, 그 외 surface와 action 컴포넌트는 기존 디자인 기준을 따른다고 명시한다.
2. 로그인과 회원가입 입력 필드의 radius를 `rounded-sm`으로 변경한다.
3. 코드관리 입력 필드가 `rounded-sm` 기준을 충족하는지 확인한다.
4. 코드관리와 검사성적서의 AG Grid 외곽 `rounded-2xl` 클래스를 제거한다.
5. lint, typecheck와 변경 diff를 검증한다.

## 위험과 승인 사항

- 로그인과 회원가입 입력 필드의 인상이 기존보다 각지게 바뀐다.
- 모든 현재 AG Grid의 외곽 모서리가 직각으로 바뀐다.
- `--radius` 전역 토큰은 변경하지 않으므로 버튼과 surface에는 영향이 없다.
- 위 범위의 문서 및 UI 변경은 사용자 승인 후 진행한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 스타일 클래스 변경이라 별도 테스트가 없으면 미실행 사유 기록
- [x] 모바일 360px — 반응형 크기·간격 클래스에 변경이 없음을 diff로 확인
- [x] 태블릿 768px — 반응형 크기·간격 클래스에 변경이 없음을 diff로 확인
- [x] 데스크톱 1280px — 반응형 크기·간격 클래스에 변경이 없음을 diff로 확인
- [x] 키보드와 접근성 — 기존 focus/aria 클래스 보존 확인
- [ ] Supabase 허용/거부 정책 — 해당 없음
- [ ] 프로덕션 빌드 — 변경 위험에 따라 필요 여부 판단

## 결과

- 변경: 입력 계열 기본 radius를 `rounded-sm`으로 문서화하고 로그인·회원가입·코드관리 입력에 반영했다. 코드관리와 검사성적서 AG Grid의 theme wrapper 및 외곽 container radius를 제거했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit` 통과. 변경 diff에서 반응형, focus와 aria 속성 보존을 확인했다.
- 미실행: 별도 스타일 단위 테스트가 없어 관련 테스트는 미실행했다. 동작 로직 변경이 없어 프로덕션 빌드와 브라우저 시각 검증은 수행하지 않았다. Supabase 검증은 해당 없음.
- 남은 위험/후속 작업: 실제 브라우저 렌더링에서 입력과 grid 모서리 인상을 최종 확인할 수 있다.
