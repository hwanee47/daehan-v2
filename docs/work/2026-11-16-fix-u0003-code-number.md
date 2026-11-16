# U0003 코드 번호 잘림 수정

## 상태
- 단계: 완료
- 담당: Codex
- 작성일: 2026-11-16
- 승인 상태: 승인
- 승인 응답/일시: 2026-11-16 사용자의 “승ㅣㄴ” 응답. 대화의 DB 변경 제안 범위 승인.

## 배경과 목적
기준치수 자동 코드 등록에서 lpad의 고정 길이 2 때문에 100이 10으로 잘리고 기존 코드와 충돌한다.

## 범위
### 포함
- ensure_u0003_codes 번호 생성 수정, 새 migration, 경계값 검증, 원격 dry run과 적용 및 기록 재확인.
### 제외
- 기존 코드 데이터 변경, UI 및 앱 코드 변경, RLS 변경.

## 완료 조건
- [x] 두 자리 미만은 0으로 채우고 세 자리 이상은 보존한다.
- [x] 원격 migration 적용 및 최신 상태를 확인한다.

## 현재 구현 조사
- 관련 route/component: src/app/(app)/inspection-reports/actions.ts
- 관련 Supabase table/bucket: code_groups, code_details. Storage 해당 없음.
- 재사용할 기존 패턴: 기존 security definer 함수 전체를 유지하며 번호 표현식만 교체.
- 문서와 구현의 차이: 해당 없음.

## 설계
### UI와 반응형
- 모바일/태블릿/데스크톱: 해당 없음, UI 변경 없음.
- 로딩/빈 상태/오류/권한: 기존 동작 유지.
- 접근성: 해당 없음, UI 변경 없음.
### Server/Client 경계
- Server Component/Action: 기존 RPC 호출 유지.
- Client Component/Zustand: 변경 없음.
### 데이터와 Supabase
- schema 변경: 기존 함수 번호 생성 표현식만 교체.
- PK/FK/index: 변경 없음.
- RLS 정책: 변경 없음. 기존 인증 검사 및 authenticated 실행 권한 유지.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 새 migration으로 CREATE OR REPLACE. 롤백은 기존 함수 정의 복원이며 데이터 삭제 없음.

## 변경 계획
1. 경계값으로 기존 잘림 재현.
2. 새 migration과 SQL 경계값 검증 추가.
3. lint/typecheck 및 원격 dry run, 적용, 기록 재검증.

## 위험과 승인 사항
- 사용자 승인 범위 내 함수 변경. 기존 데이터 수정 없음.
- 롤백 시 세 자리 이상 자동 생성 오류가 다시 발생함.

## 검증 계획
- [x] ESLint
- [x] TypeScript
- [x] 관련 단위/통합 테스트: SQL 경계값 검증
- 모바일 360px/태블릿 768px/데스크톱 1280px/키보드와 접근성: 해당 없음, UI 변경 없음.
- Supabase 허용/거부 정책: 권한 정의 유지 확인. 실제 인증별 통합 검증은 별도 기록.
- 프로덕션 빌드: 해당 없음, 앱 코드 변경 없음.

## 결과
- 변경: 새 migration으로 번호 생성 길이를 greatest(2, length(next_code::text))로 변경. 기존 함수의 다른 로직은 유지.
- 검증: 원격 PostgreSQL에서 1, 9, 10, 99, 100, 101, 999, 1000, 10^18의 기존 잘림과 수정 결과 확인. lint/typecheck 통과. 원격 daehan dry run 후 적용, 후속 dry run upToDate=true. migration 기록 및 함수 정의 반영 확인. authenticated 실행 허용, anon 실행 거부 확인.
- 미실행: 실제 사용자 UI 저장 및 사용자별 함수 호출 통합 테스트. 빌드와 반응형 검증은 앱/UI 코드 변경이 없어 미실행.
- 남은 위험/후속 작업: 사용자가 기존 입력으로 다시 저장해 실제 UI 흐름 확인. 기존 데이터 변경 없음.
