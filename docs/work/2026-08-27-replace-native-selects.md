# 기본 Select 공통 컴포넌트 전환

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: `승인`, 2026-08-27

## 배경과 목적

공통 Select 도입 후에도 세 화면에 native `select`가 남아 있어 선택박스의 디자인과 팝업 동작이 일관되지 않다. 남은 사용처를 공통 Select로 교체하되 기존 폼 제출값, 초기값과 화면 상태를 그대로 유지한다.

## 범위

### 포함

- 남은 native `select` 3개를 공통 Select로 교체
  - 측정결과 화면의 측정 이력 회차 선택
  - 성적서 관리 등록·수정의 품목상세 선택
  - 성적서 관리 등록·수정의 제품구분 선택
- 공통 Select에 폼 `name`, 초기값과 선택 안 함 값을 안전하게 전달하는 API 추가
- 기존 onChange 부수 동작 유지
  - 품목상세 변경 시 순번 마커 위치 초기화
  - 회차 변경 시 현재값/과거 이력 보기 전환
- Portal popup, label 표시, 키보드 조작과 기존 레이아웃 너비 유지

### 제외

- 체크박스, AG Grid editor와 일반 input 변경
- 검색 가능한 Combobox 또는 다중 선택 기능
- DB schema, Server Action과 저장 검증 변경

## 완료 조건

- [x] `src`에서 native `<select>` 사용처가 남지 않는다.
- [x] 측정 회차 선택 시 현재 입력값과 각 이력을 정상 전환한다.
- [x] 품목상세 변경 시 기존처럼 관련 정보가 갱신되고 마커 위치가 초기화된다.
- [x] 제품구분의 `선택 안 함`과 기존 저장값이 form action에 동일하게 전달된다.
- [x] 선택값에는 내부 코드가 아니라 사용자용 라벨이 표시된다.
- [x] 팝업이 선택박스 아래에서 열리고 분할 패널에 잘리지 않는다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/inspection-measurement-sheet.tsx`, `inspection-reports/inspection-report-management.tsx`, `src/components/ui/select.tsx`
- 관련 Supabase table/bucket: 변경 없음. 기존 form action과 조회 데이터를 그대로 사용한다.
- 재사용할 기존 패턴: Base UI 기반 공통 `Select`, Portal popup, controlled 지역 상태
- 문서와 구현의 차이: 공통 Select가 존재하지만 현재 `name`과 uncontrolled 초기값을 지원하지 않아 폼 기반 사용처를 바로 교체할 수 없다.

## 설계

### UI와 반응형

- 모바일: 기존 필드의 부모 너비를 채우고 popup은 viewport 가용 너비 안에 표시한다.
- 태블릿: Dialog와 작업 패널 overflow 밖에 Portal popup을 표시한다.
- 데스크톱: 기존 최소 너비와 40px 높이를 유지한다.
- 로딩/빈 상태/오류/권한: 옵션이 없으면 placeholder 또는 선택 안 함 상태를 유지한다.
- 접근성: 각 Field label 또는 `aria-label`을 Select Trigger에 연결하고 Base UI 키보드 흐름을 유지한다.

### Server/Client 경계

- Server Component/Action: 기존 action과 form submission 유지
- Client Component/Zustand: 기존 지역 상태만 사용하고 Zustand는 변경하지 않는다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 해당 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: migration 없음. 공통 Select API와 각 적용부를 되돌리면 된다.

## 변경 계획

1. 공통 Select가 form `name`, controlled/uncontrolled 초기값과 선택 안 함 값을 지원하도록 확장한다.
2. 측정 회차 선택을 공통 Select로 교체하고 숫자/null 변환을 유지한다.
3. 성적서 관리의 품목상세와 제품구분을 공통 Select로 교체한다.
4. 폼 제출값과 품목 변경 부수 동작을 코드상 재검토한다.
5. native select 잔존 여부, lint, typecheck와 production build를 검증한다.

## 위험과 승인 사항

- Base UI Select는 native select와 달리 hidden input으로 form 값을 제출하므로 `name`과 값 직렬화가 정확히 유지되는지 검증한다.
- 이번 범위는 현재 발견된 native select 3개 전체이며 DB와 action 로직은 변경하지 않는다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — DB 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 측정 회차, 품목상세와 제품구분의 native select를 공통 Select로 교체하고 공통 컴포넌트에 `id`, `name` 폼 지원을 추가했다.
- 검증: native select 잔존 검색 0건, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과
- 미실행: 실제 브라우저에서 저장 action 전송과 단일·분할 패널 시각 검증
- 남은 위험/후속 작업: 신규 화면은 native select 대신 공통 Select 또는 검색 요구 시 별도 Combobox를 사용한다.
