# 성적서관리 서버 조회 전환

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-28
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-28

## 배경과 목적

성적서관리 화면은 현재 전체 성적서를 받아 브라우저에서 검색, 정렬, 페이지 분할한다. 성적서 증가 시 초기 전송량과 브라우저 메모리가 커지므로 조회 조건과 페이지에 해당하는 데이터만 Supabase에서 가져오도록 전환한다.

## 범위

### 포함

- 성적서관리 목록을 서버 조건 검색, 정렬, 50건 단위 페이지 조회로 전환
- 조회 버튼 또는 Enter로 검색 조건을 적용하고, 입력 중에는 DB를 재조회하지 않음
- 페이지 이동과 정렬 변경 시 적용된 조건으로 DB 재조회
- 목록 total count를 DB count 결과로 표시
- 선택한 성적서의 검사항목, 측정값과 이미지 정보를 필요할 때 상세 조회
- 등록, 수정, 삭제 성공 후 현재 검색 조건의 목록 재조회
- 검색 중, 빈 결과와 조회 오류 상태 처리

### 제외

- DB 테이블, 컬럼, 인덱스와 RLS 변경
- 측정결과 입력 화면의 전체 성적서 적재 구조 변경
- 이미 서버 조회 방식인 측정 이력 화면 변경
- 검색 URL 및 공개 API 계약 변경

## 완료 조건

- [x] 성적서관리 최초 진입에서 목록 1페이지 최대 50건을 조회한다.
- [x] 조회, 정렬과 페이지 이동이 Supabase 재조회로 동작한다.
- [x] 품명 검색을 포함한 기존 검색 유형과 통합검색이 유지된다.
- [x] 등록, 수정, 삭제 뒤 현재 조건의 목록을 재조회한다.
- [x] 직접 URL과 작업영역 탭에서 동일한 목록 조회를 사용한다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports/page.tsx`, `inspection-report-management.tsx`, `inspection-reports/data.ts`, `inspection-reports/actions.ts`, `(app)/layout.tsx`, `workspace-panels.tsx`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_report_items`, `inspection_report_measurements`, `item_details`, `items`, `code_details`, 기존 품목 이미지 bucket
- 재사용할 기존 패턴: `inspection-measurement-history/actions.ts`의 인증 확인, 조건 query, exact count, range 기반 50건 서버 페이징
- 문서와 구현의 차이: 측정 이력은 서버 페이징이지만 성적서관리는 전체 배열의 클라이언트 필터링이다. 공통 작업영역은 측정결과 입력을 위해 전체 성적서 데이터를 별도로 선적재한다.

## 설계

### UI와 반응형

- 모바일: 기존 검색 영역의 세로 배치를 유지하고 명시적 조회로 적용한다.
- 태블릿/데스크톱: 기존 목록·상세 배치와 workspace container 반응형을 유지한다.
- 로딩/빈 상태/오류/권한: 조회 중 중복 요청 방지, 목록 로딩 표시, 조건별 빈 결과, 서버 오류 메시지, 서버 인증 검증을 제공한다.
- 접근성: form submit, 버튼 disabled 상태, 결과 수와 오류 live message를 유지한다.

### Server/Client 경계

- Server Component/Action: 목록 검색, count, 선택 상세 조회와 인증 검증을 담당한다.
- Client Component/Zustand: 조회조건 초안/적용값, 현재 페이지, 선택 행과 dialog 상태만 지역 상태로 관리한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음. 현재 인덱스 변경도 이번 범위에서 제외한다.
- RLS 정책: 기존 정책 사용
- Storage bucket/path/policy: 기존 signed URL 생성 방식 사용, 정책 변경 없음
- migration과 rollback: migration 없음. 변경 전 전체 데이터 props와 클라이언트 필터 방식으로 코드 rollback 가능

## 변경 계획

1. 성적서 목록 query/page 타입과 서버 검색 action을 추가한다.
2. 품명 검색은 기존 품목 관계를 이용해 일치하는 품목상세를 선별하고 성적서 query에 반영한다.
3. 선택 성적서의 검사항목·측정값·이미지를 가져오는 상세 action을 추가한다.
4. 관리 컴포넌트를 조회조건 초안/적용, 서버 페이지 결과, 비동기 상세 상태 구조로 바꾼다.
5. 등록·수정·삭제 이후 현재 목록과 상세를 갱신한다.
6. 직접 URL과 작업영역 패널에 첫 페이지 결과와 편집용 기준정보를 전달한다.

## 위험과 승인 사항

- 이 변경은 DB schema를 바꾸지 않는다.
- 통합검색은 여러 컬럼과 품명 관계 검색을 조합하므로 부분 query가 추가될 수 있다.
- 공통 layout이 측정결과 입력용 전체 데이터를 계속 가져오는 현재 구조 때문에 앱 전체 초기 조회량까지 제거되지는 않는다. 측정결과 입력의 목록/상세 지연 조회는 별도 Standard 작업으로 다룬다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 검색 유형별 조회와 통합검색
- [ ] 50건 초과 이전/다음 페이지 및 정렬
- [ ] 선택 상세, 등록·수정·삭제 후 재조회
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] 직접 URL/탭, 단일/2분할
- [x] 프로덕션 빌드

## 결과

- 변경: 성적서 목록 검색, 정렬, exact count와 50건 range를 Server Action으로 전환했다. 등록·수정·삭제 성공 뒤 적용된 조건의 첫 페이지를 다시 조회한다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 인증된 브라우저에서 실제 데이터 기반 검색 유형별 수동 검증
- 남은 위험/후속 작업: 공통 작업영역이 측정결과 입력과 편집 상세를 위해 전체 데이터를 선적재하는 구조는 유지된다. 이를 제거하려면 측정결과 입력 목록과 성적서 상세도 별도 지연 조회로 전환해야 한다.
