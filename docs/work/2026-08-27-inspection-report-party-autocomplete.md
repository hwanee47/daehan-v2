# 검사성적서 고객명·업체명 U0001 자동완성

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

검사성적서 등록·수정에서 고객명과 업체명을 매번 직접 입력하지 않고 코드관리의 `U0001` 활성 상세코드를 검색해 선택할 수 있게 한다. 기존 성적서의 자유 텍스트 값과 아직 코드에 없는 이름도 유지할 수 있도록 자동완성 형태로 제공한다.

## 범위

### 포함

- 검사성적서 공통코드 조회 대상에 활성 `U0001` 상세코드 추가
- `InspectionCodeOption` 타입에 `U0001` 허용
- 고객명과 업체명 input을 동일한 검색 자동완성 UI로 변경
- 코드와 코드명을 대상으로 대소문자 구분 없는 포함 검색
- 검색 결과를 input 아래 한 줄 `코드 · 코드명`으로 표시
- 빈 input 포커스 시 결과를 미리 표시하지 않고, 검색어 입력 후에만 popup 표시
- 마우스 및 ArrowUp/ArrowDown, Enter, Escape 키보드 조작
- 결과 선택 시 `code_name`을 고객명 또는 업체명 text로 제출
- 기존 저장값과 직접 입력값 유지

### 제외

- `inspection_reports.customer_name`, `supplier_name`을 코드 FK로 변경
- U0001 코드 데이터 생성·수정·활성화
- DB schema, index, RLS 또는 migration 변경
- 고객명과 업체명에 서로 다른 코드그룹 도입
- 서버 자동완성 API와 페이지네이션

## 완료 조건

- [x] 고객명과 업체명에 검색어를 입력하면 활성 U0001 코드가 아래에 표시된다.
- [x] 코드 또는 코드명으로 검색할 수 있다.
- [x] 결과 선택 시 코드명이 기존 text 컬럼 저장값으로 제출된다.
- [x] U0001에 없는 이름도 직접 입력하고 저장할 수 있다.
- [x] 수정 화면에서 기존 고객명·업체명이 그대로 표시된다.
- [x] 빈칸 포커스만으로 목록이 미리 열리지 않는다.
- [x] 결과가 없으면 이해 가능한 안내를 표시한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/inspection-reports/data.ts`, `types.ts`, `inspection-report-management.tsx`, `item-detail-combobox.tsx`, `actions.ts`
- 관련 Supabase table/bucket: `public.code_groups`, `public.code_details`, `public.inspection_reports`; Storage는 해당 없음.
- 재사용할 기존 패턴: 검사성적서 데이터 로더의 활성 공통코드 조회, Base UI 검색 popup의 스타일·키보드 동작, 기존 Server Action의 trim·100자 제한을 유지한다.
- 문서와 구현의 차이: 현재 공통코드 조회는 `U0002`, `FINAL_JUDGMENT_STATUS`만 포함하고 고객명·업체명은 일반 text input이다.

## 설계

### UI와 반응형

- 모바일: 기존 한 열 input 폭을 유지하고 결과 popup은 input 너비 이상, 화면 가용 폭 이하로 표시한다.
- 태블릿: 기존 기본정보 2열 배치를 유지한다.
- 데스크톱: 기존 기본정보 3열 배치를 유지하며 결과는 `코드 · 코드명` 한 줄로 표시한다.
- 로딩/빈 상태/오류/권한: 데이터는 dialog 전에 기존 공통 로더에서 조회한다. 검색 결과가 없으면 `일치하는 U0001 코드가 없어요.`를 표시하고 직접 입력은 허용한다. 코드 query 오류는 기존 전체 데이터 오류 상태에 포함한다.
- 접근성: 자유 입력을 허용하는 Base UI Autocomplete 또는 동등한 ARIA combobox를 사용해 label, listbox, option과 방향키·Enter·Escape 동작을 제공한다.

### Server/Client 경계

- Server Component/Action: 기존 데이터 로더가 U0001 코드를 함께 조회한다. Server Action은 현재 고객명·업체명 text trim과 길이 검증을 그대로 수행한다.
- Client Component/Zustand: 고객명·업체명 입력값과 검색 popup 상태를 각 기능 전용 자동완성 컴포넌트의 지역 상태로 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음. 고객명·업체명은 계속 text로 저장한다.
- PK/FK/index: 변경 없음. `code_details.seq`를 검사성적서에 저장하지 않는다.
- RLS 정책: 변경 없음. 기존 authenticated 공통코드 select와 검사성적서 저장 정책을 사용한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 U0001 조회와 자동완성 UI를 제거하고 일반 input으로 복원한다.

## 변경 계획

1. 현재 설치된 Base UI Autocomplete API와 자유 입력·선택 동작을 확인한다.
2. 공통코드 조회에 U0001을 포함하고 코드 option 타입을 확장한다.
3. U0001 코드·코드명 검색과 직접 입력을 지원하는 기능 전용 자동완성 컴포넌트를 구현한다.
4. 고객명·업체명 input을 교체하고 기존 초기값·form name·100자 제한을 유지한다.
5. 빈 검색, 결과 없음, 직접 입력, 선택과 수정 초기값 흐름을 검토한다.
6. lint, typecheck, build와 가능한 workspace 폭·키보드 흐름을 검증한다.

## 위험과 승인 사항

- 고객명과 업체명 모두 같은 U0001 목록을 사용한다.
- 선택 시 화면의 코드명이 text로 저장되며 U0001 `seq`나 `code`는 저장하지 않는다. 코드명이 변경되어도 과거 성적서 text는 자동 변경되지 않는다.
- 기존 성적서 또는 아직 등록되지 않은 거래처명을 보존하기 위해 U0001 선택을 강제하지 않고 직접 입력을 허용한다.
- U0001 코드명이 100자를 넘으면 기존 Server Action 검증에 따라 저장되지 않는다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일/좁은 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [ ] 태블릿/50:50 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [ ] 데스크톱/넓은 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — Base UI Autocomplete의 input/listbox/option semantics, 방향키·Enter·Escape와 기존 label 연결을 정적 확인
- [x] Supabase 허용/거부 정책 — DB/RLS 변경 없음, 기존 authenticated 코드 조회와 검사성적서 저장 경계를 유지
- [x] 프로덕션 빌드

## 결과

- 변경: 검사성적서 공통코드 조회에 활성 U0001을 포함하고, 고객명·업체명을 코드·코드명 검색과 직접 입력을 모두 지원하는 Base UI Autocomplete로 교체했다. 결과 선택 시 U0001 코드명이 기존 text form 값으로 제출된다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. U0001 타입 확장, 기존 U0002/판정 필터 유지와 text form name 연결을 정적 확인했다.
- 미실행: 테스트 환경과 인증된 브라우저 세션이 없어 실제 U0001 원격 데이터 기반 검색·선택 및 workspace 폭별 시각 검증은 수행하지 않았다.
- 남은 위험/후속 작업: U0001 코드명이 100자를 넘으면 기존 Server Action 제한으로 저장되지 않는다. 빌드 중 현재 Node.js 20 이하 지원 중단 예정이라는 Supabase 경고가 표시됐다.
