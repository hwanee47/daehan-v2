# 전 품목 오차범위 기준값 복제

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-31
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-31

## 배경과 목적

품목코드 `B302B-12200`에 등록된 오차범위를 현재 등록된 다른 모든 품목에 동일하게 적용한다.

## 범위

### 포함

- 원본 품목과 원본 오차범위 존재 여부 검증
- 원본 외 현재 등록된 모든 품목에 원본 오차범위 복제
- 원본의 치수 하한·상한, 하한·상한 편차와 비고 복제
- 적용 전 기존 오차범위 데이터 백업
- 원격 dry run, 적용 및 사후 검증

### 제외

- 테이블, 컬럼, 제약, 인덱스와 RLS 변경
- 이후 신규 등록되는 품목에 대한 자동 복제
- 원본 `B302B-12200`의 오차범위 변경

## 완료 조건

- [x] 원본 외 모든 현재 품목이 원본과 동일한 오차범위 집합을 가진다.
- [x] 일부만 반영되지 않도록 하나의 transaction에서 처리한다.
- [x] 원본이나 원본 범위가 없으면 migration이 중단된다.
- [x] 대상에 기존 값이 있으면 전체 작업을 중단하여 덮어쓰지 않는다.

## 현재 구현 조사

- 관련 route/component: `master/tolerance-ranges`
- 관련 Supabase table/bucket: `items`, `item_tolerance_ranges`
- 재사용할 기존 패턴: Supabase SQL migration과 원격 dry run/apply 흐름
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 해당 없음: 데이터 일괄 적용 작업이다.

### Server/Client 경계

- 해당 없음: 애플리케이션 코드를 변경하지 않는다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 기존 PK, FK와 구간 중복 exclusion constraint 유지
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 원본 외 범위가 이미 존재하면 migration을 중단한다. 기존 데이터 삭제 없이 원본 범위만 복제하며, transaction 실패 시 전체 rollback된다.

## 변경 계획

1. 원본 품목과 범위 존재 여부를 검증하는 migration을 작성한다.
2. 원격 dry run 결과를 확인한다.
3. migration을 적용하고 원격 migration 기록을 확인한다.
4. 품목별 범위 수와 값의 동일성을 검증한다.

## 위험과 승인 사항

- 대상 품목에 기존 오차범위가 있으면 안전을 위해 migration 전체가 중단된다.
- 현재 등록된 품목만 대상이며 이후 생성되는 품목은 자동 적용되지 않는다.
- 위 범위는 2026-08-31 사용자 승인 완료.

## 검증 계획

- [x] migration SQL 검토
- [x] 원격 dry run
- [x] 기존 대상 데이터 덮어쓰기 방지 검증
- [x] 원격 migration 적용
- [x] 원격 migration 목록 최신 상태
- [x] 품목별 행 개수 및 값 비교

## 결과

- 변경: `B302B-12200`의 오차범위를 원본 외 현재 모든 품목에 복제하는 migration을 원격 적용했다.
- 검증: migration 내부에서 예상 복제 행 수와 양방향 집합 차이를 검사했다. 원격 migration 목록의 local/remote 일치와 후속 dry run `upToDate: true`를 확인했다.
- 미실행: Docker 미설치로 `supabase db dump` 백업은 실행하지 못했다. 대신 대상 기존 값이 하나라도 있으면 적용 전에 전체 중단하도록 변경했으며 실제 migration이 성공해 삭제·덮어쓰기 대상이 없었음을 확인했다.
- 남은 위험/후속 작업: 이후 새로 등록되는 품목에는 자동 복제되지 않는다.
