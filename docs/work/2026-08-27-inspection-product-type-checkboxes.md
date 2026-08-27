# 검사성적서 제품구분 체크박스 및 U0002 코드 연결

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

검사성적서의 제품구분을 체크박스 형태로 출력하고, 실제 공통코드 그룹인 `U0002`의 활성 상세 코드를 조회해 표시한다. 현재 구현은 존재하지 않거나 실제 운영 코드와 다른 `PRODUCT_TYPE` 그룹 식별자를 사용하므로 제품구분 목록이 비어 보일 수 있다.

## 범위

### 포함

- 검사성적서 데이터 조회에서 제품구분 그룹을 `U0002`로 변경
- 검사성적서 관리 화면의 제품구분 선택 목록을 `U0002` 기준으로 변경
- 측정결과 입력·인쇄 화면의 제품구분을 읽기 전용 체크박스로 표시
- 관련 TypeScript 코드 그룹 타입을 실제 코드에 맞게 변경

### 제외

- DB 테이블, 컬럼, 코드 데이터, RLS 또는 migration 변경
- 제품구분의 다중 선택 저장 구조 변경
- 기존 `product_type_code_seq` 단일 선택 데이터 모델 변경

## 완료 조건

- [x] `U0002` 그룹의 활성 상세 코드가 제품구분 목록에 표시된다.
- [x] 측정결과 화면과 인쇄물에서 각 제품구분이 체크박스로 보인다.
- [x] 현재 `product_type_code_seq`와 일치하는 항목 하나만 체크되어 표시된다.
- [x] 값이 없어도 제품구분 코드는 체크되지 않은 상태로 모두 표시된다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports/data.ts`, `types.ts`, `inspection-report-management.tsx`, `inspection-measurements/inspection-measurement-sheet.tsx`
- 관련 Supabase table/bucket: `code_groups`, `code_details`, `inspection_reports` 읽기만 사용
- 재사용할 기존 패턴: 활성 코드 조회와 `product_type_code_seq` 단일 FK 선택 패턴
- 문서와 구현의 차이: 기존 작업 문서는 `PRODUCT_TYPE`을 가정하지만 실제 운영 그룹 코드는 `U0002`다.

## 설계

### UI와 반응형

- 모바일: 기존 성적서 최소 폭과 가로 스크롤 동작 유지
- 태블릿: 기존 레이아웃 유지
- 데스크톱: 제품구분을 한 줄 체크박스 목록으로 표시
- 로딩/빈 상태/오류/권한: 기존 성적서 데이터 오류 처리 유지, 코드가 없으면 빈 목록 표시
- 접근성: 체크박스는 비활성화된 읽기 전용 표현으로 코드명을 label에 연결

### Server/Client 경계

- Server Component/Action: 서버 데이터 조회의 코드 그룹 필터만 `U0002`로 변경
- Client Component/Zustand: 기존 지역 렌더링 유지, 새로운 전역 상태 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음, 코드 상수와 UI 타입을 이전 값으로 되돌리면 rollback 가능

## 변경 계획

1. 코드 조회와 타입의 제품구분 그룹 식별자를 `U0002`로 통일한다.
2. 성적서 관리 선택 목록과 측정결과 출력 목록의 필터를 `U0002`로 변경한다.
3. 측정결과의 제품구분 입력 표현을 radio에서 checkbox로 변경한다.
4. lint, typecheck와 production build로 검증한다.

## 위험과 승인 사항

- `U0002`가 실제 `code_groups.group_code`라는 사용자 제공 정보를 기준으로 한다.
- 저장 모델은 단일 `product_type_code_seq`이므로 체크박스 UI여도 동시에 하나만 체크되어 표시된다. 다중 선택 저장은 별도 DB 설계·승인이 필요하다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — DB/RLS 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 제품구분 그룹 식별자를 `U0002`로 통일하고 측정결과·인쇄 표현을 체크박스로 변경했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 인증된 실제 데이터 기반 viewport 및 인쇄 미리보기 수동 확인
- 남은 위험/후속 작업: 다중 제품구분 저장이 필요하면 별도 데이터 모델 검토
