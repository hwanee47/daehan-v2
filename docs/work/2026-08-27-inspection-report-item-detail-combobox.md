# 검사성적서 품목상세 검색형 콤보박스

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

검사성적서 등록·수정 화면의 품목상세가 일반 선택박스라 항목이 많아질수록 원하는 값을 찾기 어렵다. 텍스트를 입력하면 관련 품목상세가 입력창 아래에 표시되는 검색형 콤보박스로 전환해 선택 속도와 정확성을 높인다.

## 범위

### 포함

- 검사성적서 등록·수정의 품목상세 `Select`를 검색 가능한 input 기반 combobox로 변경
- 상세코드, 상세명, 품목명, 기종, 재질을 대상으로 대소문자 구분 없는 포함 검색
- 검색 결과를 입력창 아래 popup listbox로 표시
- 각 결과의 기본 표기는 `품목상세코드 · 품목상세명`, 보조 표기는 `품목명 · 기종 · 재질`
- 결과 최대 높이와 내부 스크롤, 결과 없음 안내
- 마우스 선택 및 ArrowUp/ArrowDown, Enter, Escape 키보드 조작
- 기존 등록·수정값의 선택 상태와 표시값 복원
- 선택 시 기종·품명·재질·이미지 연동 및 다른 품목상세로 변경할 때 순번 이미지 위치 초기화 유지
- 실제 저장값은 기존 `itemDetailSeq` hidden input으로 전달

### 제외

- DB schema, index, RLS, migration 변경
- 서버 검색 API, 원격 자동완성 또는 페이지네이션
- 새 품목상세 등록 기능
- 제품구분 등 다른 Select 컴포넌트 변경
- 품목상세 데이터 로딩 구조 변경

## 완료 조건

- [x] 품목상세 입력창에 검색어를 입력하면 관련 결과가 아래에 표시된다.
- [x] 상세코드·상세명·품목명·기종·재질 중 하나와 일치하는 결과를 찾을 수 있다.
- [x] 결과를 마우스와 키보드로 선택할 수 있다.
- [x] 선택값의 `item_detail_seq`가 기존 Server Action에 동일하게 제출된다.
- [x] 수정 화면에서 저장된 품목상세가 처음부터 선택되어 표시된다.
- [x] 다른 품목상세 선택 시 연동 정보가 갱신되고 이미지 순번 위치가 초기화된다.
- [x] 선택 없이 저장하면 기존 서버 검증 메시지가 유지된다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/inspection-reports/inspection-report-management.tsx`, `data.ts`, `types.ts`, `actions.ts`, `src/components/ui/select.tsx`
- 관련 Supabase table/bucket: 기존 조회 결과의 `public.item_details`, 연결된 `public.items`, 기존 품목 이미지 Storage; 변경 없음.
- 재사용할 기존 패턴: `InspectionReportData.itemOptions`, React 지역 상태, 기존 input 스타일, Base UI dialog portal과 Server Action form 제출을 유지한다.
- 문서와 구현의 차이: 현재 품목상세는 전체 옵션을 일반 `Select`로 표시하며 텍스트 검색과 결과 listbox가 없다.

## 설계

### UI와 반응형

- 모바일: 입력창 폭을 폼 전체로 사용하고 popup은 입력창 너비 안에서 최대 높이 후 스크롤한다.
- 태블릿: 기존 기본정보 grid에서 품목상세가 차지하는 전체 행 너비를 유지한다.
- 데스크톱: 기존 `sm:col-span-2 lg:col-span-3` 영역을 유지해 긴 코드·이름과 보조 정보를 읽을 수 있게 한다.
- 로딩/빈 상태/오류/권한: 데이터는 기존 dialog 진입 전에 로드되어 별도 원격 로딩은 없다. 검색 결과가 없으면 `일치하는 품목상세가 없어요.`를 표시한다. 저장 오류·권한 처리는 기존 Server Action을 유지한다.
- 접근성: input에 `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, popup에 `role="listbox"`, 결과에 `role="option"`과 선택 상태를 제공한다. 방향키, Enter, Escape와 focus 복귀를 지원한다.

### Server/Client 경계

- Server Component/Action: 변경 없음. 기존 `itemDetailSeq` 검증과 DB 재조회로 저장값을 검증한다.
- Client Component/Zustand: 검색어, popup 열림, 활성 결과 index와 선택 seq를 `ReportEditor` 가까운 지역 상태로 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음.
- PK/FK/index: 변경 없음. 이미 클라이언트에 전달된 `itemOptions`를 검색하므로 DB index를 추가하지 않는다.
- RLS 정책: 변경 없음.
- Storage bucket/path/policy: 변경 없음. 선택된 기존 `image_url` 표시를 유지한다.
- migration과 rollback: 해당 없음. 롤백은 검색형 콤보박스를 기존 `Select`로 복원한다.

## 변경 계획

1. 현재 설치된 Base UI 또는 기존 primitive에서 접근 가능한 combobox 구현 가능 범위를 확인한다.
2. 품목상세 검색·정규화·결과 렌더링과 키보드 이동을 담당하는 기능 전용 컴포넌트를 구현한다.
3. 기존 품목상세 Select를 교체하고 `itemDetailSeq`, 연동 필드와 marker 초기화 로직을 연결한다.
4. 등록 초기값, 수정 초기값, 검색 결과 없음과 선택 변경 흐름을 검토한다.
5. lint, typecheck, build 및 가능한 workspace 폭·키보드 흐름을 검증한다.

## 위험과 승인 사항

- 이번 구현은 이미 로드된 전체 `itemOptions`를 브라우저에서 검색한다. 품목상세가 매우 많아져 초기 로딩량이 문제가 되면 서버 자동완성과 지연 조회를 별도 작업으로 전환해야 한다.
- 사용자가 선택 후 표시 텍스트를 다시 편집하면 기존 선택값을 해제해 화면 텍스트와 실제 제출 seq가 불일치하지 않게 한다.
- 검색어 비교는 사용자 편의를 위해 trim과 소문자 변환 후 포함 여부로 판단한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일/좁은 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [ ] 태블릿/50:50 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [ ] 데스크톱/넓은 workspace — 인증된 브라우저 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — Base UI Combobox의 input/listbox/option semantics, 방향키·Enter·Escape와 연결 label을 정적 확인
- [x] Supabase 허용/거부 정책 — DB와 정책 변경 없음, 기존 Server Action의 item detail 재조회·검증 유지 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 검사성적서 등록·수정의 품목상세 Select를 Base UI 검색형 combobox로 교체했다. 상세코드·상세명·품목명·기종·재질 포함 검색, 보조 정보 결과, 선택 지우기, 결과 없음과 기존 연동 상태를 구현했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 선택 표시 텍스트를 수정하면 기존 hidden seq가 즉시 해제되도록 제출값 일치도 정적 확인했다.
- 미실행: 테스트 환경과 인증된 관리자 브라우저 세션이 없어 실제 원격 데이터 기반 검색·선택 및 workspace 폭별 시각 검증은 수행하지 않았다.
- 남은 위험/후속 작업: 품목상세 데이터가 매우 많아 초기 로딩량이 문제가 되면 서버 자동완성·지연 조회 방식으로 별도 전환한다. 빌드 중 현재 Node.js 20 이하 지원 중단 예정이라는 Supabase 경고가 표시됐다.
