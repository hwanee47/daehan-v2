# 품목관리 조회조건 추가

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-24

## 배경과 목적

품목이 많아져도 관리자가 원하는 품목을 빠르게 찾을 수 있도록 품목관리 화면 상단에 조회조건 영역을 제공한다. 조회 상태는 URL에 보존해 새로고침하거나 주소를 공유해도 같은 결과를 복원할 수 있게 한다.

## 범위

### 포함

- 품목관리 제목 아래, 그리드 위에 조회조건 영역 추가
- `품목코드`, `품목명`, `모델명` 조회조건 제공
- 입력된 각 조건을 AND로 결합하고 각 컬럼은 대소문자 구분 없는 부분 일치 조회
- `조회` 버튼과 조건·결과를 초기화하는 `초기화` 동작 제공
- GET form과 URL search params(`itemCode`, `itemName`, `modelName`)로 조회 상태 유지
- 검색 결과에 속한 품목의 품목상세만 조회
- 검색 결과가 없을 때 전용 빈 상태 안내

### 제외

- 품목상세코드·상세명·소재를 기준으로 한 역방향 품목 검색
- 자동완성, 입력 즉시 조회, 최근 검색어와 검색 조건 저장
- 페이지네이션, 정렬 조건의 URL 저장과 일괄 조회 기능
- DB schema, index, RLS 또는 migration 변경

## 완료 조건

- [x] 품목코드, 품목명, 모델명을 각각 또는 조합해 품목을 조회할 수 있다.
- [x] 여러 조건은 AND, 각 텍스트 조건은 대소문자 구분 없는 부분 일치로 동작한다.
- [x] 조회조건이 URL에 유지되고 새로고침 후 복원된다.
- [x] 초기화하면 조회조건이 제거되고 전체 품목을 다시 표시한다.
- [x] 결과가 없을 때 조회조건에 맞는 품목이 없다는 안내를 표시한다.
- [x] 검색 결과 품목에 해당하는 품목상세만 클라이언트에 전달한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/items/page.tsx`, `src/app/(app)/master/items/item-management.tsx`
- 관련 Supabase table/bucket: `public.items`, `public.item_details`; Storage는 해당 없음.
- 재사용할 기존 패턴: Server Component의 Supabase query, 디자인 시스템의 `rounded-sm` 입력, `Button`, `Container`, AG Grid 빈 상태를 재사용한다.
- 문서와 구현의 차이: 현재 품목관리 page는 조건 없이 전체 품목과 전체 품목상세를 조회하며, 저장소에 별도 조회조건 컴포넌트 패턴은 없다.

## 설계

### UI와 반응형

- 모바일: 세 입력과 버튼을 한 열로 쌓고 각 입력·버튼은 최소 44px 높이를 유지한다.
- 태블릿: 입력 세 개를 가용 폭에 맞춰 배치하고 조회·초기화 동작을 같은 영역에 둔다.
- 데스크톱: 한 줄 또는 안정적인 grid로 조건과 동작을 배치해 그리드보다 먼저 읽히게 한다.
- 로딩/빈 상태/오류/권한: GET navigation 동안 기존 Next.js 전환 동작을 사용한다. 조건이 있고 결과가 없으면 `조회조건에 맞는 품목이 없어요.`를 표시하며 기존 query 오류와 권한 처리는 유지한다.
- 접근성: 모든 입력에 연결된 label을 제공하고 Enter로 form을 제출할 수 있게 한다. 조회는 submit button, 초기화는 `/master/items` 링크로 제공한다.

### Server/Client 경계

- Server Component/Action: page의 비동기 `searchParams`를 읽어 길이를 제한하고 Supabase `ilike` 조건을 구성한다. 조회는 변경 작업이 아니므로 Server Action을 추가하지 않는다.
- Client Component/Zustand: 조회조건 form은 서버에서 렌더링하고 현재 조건을 `defaultValue`로 표시한다. 그리드 선택 상태만 기존 Client Component에 유지하며 Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음.
- PK/FK/index: 기존 schema와 index를 유지한다. 검색 대상 text 컬럼에 별도 검색 index는 이번 범위에서 추가하지 않는다.
- RLS 정책: 변경 없음. 기존 관리자 page gate와 authenticated select 정책을 유지한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 조회조건 UI와 search params 기반 query만 제거한다.

## 변경 계획

1. Next.js 16 page `searchParams` 규칙과 Supabase query builder 사용 범위를 확인한다.
2. page에서 조회조건을 정규화하고 `items` query에 조건별 `ilike`를 적용한다.
3. 조회된 품목의 `seq`에 해당하는 품목상세만 조회하도록 query 흐름을 조정한다.
4. 상단 조회조건 GET form과 초기화 링크를 추가하고 현재 조건을 유지한다.
5. 전체 비어 있음과 검색 결과 없음의 빈 상태 메시지를 구분한다.
6. lint, typecheck, build와 가능한 반응형·키보드 동작을 검증한다.

## 위험과 승인 사항

- 부분 일치 검색은 데이터가 매우 많아지면 현재 일반 인덱스를 충분히 활용하지 못할 수 있다. 이번 범위에서는 DB 변경 없이 구현하고 성능 문제가 확인되면 trigram index를 별도 Data migration으로 제안한다.
- `%`, `_`는 PostgreSQL 패턴 문자이므로 사용자 입력에서는 일반 문자로 취급되도록 escape해 의도치 않게 검색 범위가 넓어지지 않게 한다.
- 검색 결과가 없을 때 품목상세 전체를 조회하지 않도록 별도 분기한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일 360px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 태블릿 768px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 데스크톱 1280px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — label 연결, GET form Enter 제출, 링크와 버튼의 의미 및 최소 높이를 정적 확인
- [x] Supabase 허용/거부 정책 — 기존 RLS와 관리자 page gate를 변경하지 않았음을 정적 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 품목관리 상단에 품목코드·품목명·모델명 조회조건과 조회·초기화 동작을 추가했다. URL search params를 서버에서 읽어 AND `ilike` query를 적용하고 검색 결과 품목의 상세만 조회하도록 조정했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 빌드 결과에서 `/master/items` 동적 route를 확인했다.
- 미실행: 테스트 환경과 관리자 테스트 세션이 없어 실제 원격 조회 결과 및 360px·768px·1280px 브라우저 화면은 검증하지 않았다.
- 남은 위험/후속 작업: 데이터가 크게 증가해 부분 일치 조회 성능이 저하되면 별도 승인 후 trigram index 도입을 검토한다. 빌드 중 현재 Node.js 20 이하 지원 중단 예정이라는 Supabase 경고가 표시됐다.
