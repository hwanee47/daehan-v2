# 오차범위관리 조회조건 추가

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-24

## 배경과 목적

오차범위관리에서 대상 품목을 빠르게 찾을 수 있도록 화면 상단에 품목 조회조건을 제공한다. 품목관리 화면과 같은 조회 규칙과 배치를 사용해 기준정보 화면 간 사용 경험을 일관되게 유지한다.

## 범위

### 포함

- 오차범위관리 제목 아래, 그리드 위에 조회조건 영역 추가
- `품목코드`, `품목명`, `모델명` 조회조건 제공
- 입력 조건을 AND로 결합하고 각 컬럼은 대소문자 구분 없는 부분 일치 조회
- 데스크톱에서 입력 3개와 `초기화`·`조회` 버튼을 한 줄로 배치
- GET form과 URL search params(`itemCode`, `itemName`, `modelName`)로 조회 상태 유지
- 조회된 품목에 속한 `item_tolerance_ranges`만 조회
- 전체 품목 없음과 검색 결과 없음의 빈 상태 메시지 구분

### 제외

- 기준 치수, 상한·하한 편차와 비고를 조건으로 한 오차범위 검색
- 자동완성, 입력 즉시 조회, 페이지네이션과 최근 검색어
- DB schema, index, RLS 또는 migration 변경

## 완료 조건

- [x] 품목코드, 품목명, 모델명을 각각 또는 조합해 오차범위 대상 품목을 조회할 수 있다.
- [x] 여러 조건은 AND, 각 텍스트 조건은 대소문자 구분 없는 부분 일치로 동작한다.
- [x] 조회조건이 URL에 유지되고 초기화 시 전체 품목으로 돌아간다.
- [x] 데스크톱에서 조회조건과 두 동작 버튼이 한 줄에 배치된다.
- [x] 결과가 없으면 조회조건에 맞는 품목이 없다는 안내를 표시한다.
- [x] 조회된 품목에 속한 오차범위만 클라이언트에 전달한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/tolerance-ranges/page.tsx`, `src/app/(app)/master/tolerance-ranges/tolerance-range-management.tsx`, 품목관리 조회조건 구현
- 관련 Supabase table/bucket: `public.items`, `public.item_tolerance_ranges`; Storage는 해당 없음.
- 재사용할 기존 패턴: 품목관리의 비동기 `searchParams`, GET form, Supabase `ilike`, 패턴 문자 escape, 결과 연관 데이터 제한 조회와 빈 상태 분기를 동일하게 적용한다.
- 문서와 구현의 차이: 현재 오차범위관리는 전체 품목과 전체 오차범위를 병렬 조회하며 조회조건이 없다.

## 설계

### UI와 반응형

- 모바일: 조건과 버튼을 가용 폭에 따라 쌓아 입력 폭과 44px 이상 동작 영역을 유지한다.
- 태블릿: 2열 조건 배치 후 버튼을 같은 조회 영역 안에 둔다.
- 데스크톱: 품목코드·품목명·모델명·초기화·조회 동작을 한 줄에 배치한다.
- 로딩/빈 상태/오류/권한: 기존 query 오류와 관리자 gate를 유지하고, 조건이 있으며 품목이 없으면 `조회조건에 맞는 품목이 없어요.`를 표시한다.
- 접근성: 각 입력에 label을 연결하고 Enter 제출, 초기화 링크와 조회 submit button의 의미를 구분한다.

### Server/Client 경계

- Server Component/Action: page에서 비동기 `searchParams`를 정규화하고 `items` query에 조건을 적용한 뒤, 결과 품목 seq로 오차범위를 제한 조회한다. 조회용 Server Action은 추가하지 않는다.
- Client Component/Zustand: 현재 조건은 server-rendered form의 `defaultValue`로 복원한다. 기존 선택·dialog 지역 상태를 유지하며 Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음.
- PK/FK/index: 기존 schema와 index를 유지한다. 부분 일치 검색 index는 추가하지 않는다.
- RLS 정책: 변경 없음. 기존 관리자 page gate와 authenticated select 정책을 유지한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 조회 form과 search params query를 제거하고 기존 전체 조회로 복원한다.

## 변경 계획

1. 품목관리에서 검증된 search params 정규화와 LIKE 패턴 escape를 오차범위 page에 적용한다.
2. 품목 query에 조건별 `ilike`를 적용하고 결과 품목의 seq만 수집한다.
3. 결과 품목에 속한 오차범위만 조회하며 결과가 없으면 query를 건너뛴다.
4. 품목관리와 동일한 조회조건 GET form을 오차범위관리 상단에 추가한다.
5. Client Component에 조회조건 존재 여부를 전달해 빈 상태 메시지를 구분한다.
6. lint, typecheck, build와 가능한 반응형·키보드 동작을 검증한다.

## 위험과 승인 사항

- 부분 일치 검색은 데이터 증가 시 성능이 저하될 수 있다. 실제 문제가 확인되면 trigram index를 별도 Data migration으로 제안한다.
- `%`, `_`와 역슬래시는 일반 입력 문자로 검색되도록 escape한다.
- 조회 결과가 없을 때 전체 오차범위를 가져오지 않도록 별도 분기한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일 360px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 태블릿 768px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 데스크톱 1280px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — label 연결, GET form Enter 제출, 링크와 submit button 의미를 정적 확인
- [x] Supabase 허용/거부 정책 — 기존 RLS와 관리자 page gate를 변경하지 않았음을 정적 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 오차범위관리 상단에 품목코드·품목명·모델명 조회조건과 초기화·조회 동작을 추가했다. URL search params를 서버에서 정규화해 AND `ilike` query를 적용하고 결과 품목에 속한 오차범위만 조회한다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 빌드 결과에서 `/master/tolerance-ranges` 동적 route를 확인했다.
- 미실행: 테스트 환경과 관리자 테스트 세션이 없어 실제 원격 조회 결과 및 360px·768px·1280px 브라우저 화면은 검증하지 않았다.
- 남은 위험/후속 작업: 데이터 증가로 부분 일치 조회 성능이 저하되면 별도 승인 후 trigram index 도입을 검토한다. 빌드 중 현재 Node.js 20 이하 지원 중단 예정이라는 Supabase 경고가 표시됐다.
