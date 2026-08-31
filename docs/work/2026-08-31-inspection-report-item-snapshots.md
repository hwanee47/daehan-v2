# 검사성적서 품목정보 스냅샷 보완

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-31
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `진행해줘` / 2026-08-31

## 배경과 목적

품목과 코드 기준정보가 변경된 이후에도 검사성적서와 측정 이력에서 작성 당시 정보를 조회할 수 있도록 마스터의 품목정보 스냅샷을 보완한다.

## 범위

### 포함

- 검사성적서 마스터에 품목코드, 품명, 품목상세명, 재질, 제품구분 코드·코드명과 이미지 경로 스냅샷 추가
- 기존 기종과 품목상세코드 스냅샷 유지
- 기존 성적서를 현재 기준정보로 backfill
- 품목상세 또는 제품구분 선택 변경 시 관련 스냅샷 자동 갱신
- 신규 측정 이력은 최신 기준정보가 아니라 검사성적서 마스터 스냅샷에서 생성
- 측정 이력에 누락된 품목코드 스냅샷 추가
- 성적서관리와 결과입력에서 마스터 스냅샷 표시
- 성적서나 측정 이력이 참조하는 기존 이미지 object 보존

### 제외

- 과거 기준정보 변경 전 값을 역으로 복구
- 납품일자, 검사자, 검사일자, 특기사항과 상태 재도입
- Storage bucket/RLS 정책 변경

## 완료 조건

- [x] 신규 성적서에 선택 시점의 품목정보가 저장된다.
- [x] 기준정보가 바뀌어도 기존 성적서 표시값이 바뀌지 않는다.
- [x] 신규 측정 이력이 성적서 마스터 스냅샷을 복제한다.
- [x] 참조 중인 이미지 교체·연결 해제 시 과거 object를 삭제하지 않는다.
- [x] 기존 성적서는 현재 기준정보로 누락 없이 backfill된다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports`, `inspection-measurements`, `inspection-measurement-history`, `api/item-images`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_measurement_runs`, `item_details`, `items`, `code_details`, `item-images`
- 재사용할 기존 패턴: `set_inspection_report_item_snapshot`, `validate_inspection_report_codes`, 측정회차 스냅샷과 signed URL 생성
- 문서와 구현의 차이: 측정회차는 품명·상세명·재질·이미지 경로를 저장하지만 현재 품목 테이블에서 읽으며, 마스터에는 해당 스냅샷이 없다. 이미지 교체 시 이력이 참조한 object도 삭제된다.

## 설계

### UI와 반응형

- 기존 레이아웃은 유지하고 표시 데이터의 출처만 마스터 스냅샷으로 변경한다.
- 로딩/빈 상태/오류/권한: 기존 처리 유지
- 접근성: 변경 없음

### Server/Client 경계

- Server/DB: 스냅샷 생성·검증, backfill, signed URL 생성
- Client: 전달받은 스냅샷 표시

### 데이터와 Supabase

- schema 변경: `inspection_reports` 7개 컬럼, `inspection_measurement_runs.item_code` 추가
- PK/FK/index: 변경 없음. 스냅샷 문자열은 FK를 두지 않는다.
- RLS 정책: 변경 없음
- Storage: 참조 중인 object 삭제 방지, 정책 변경 없음
- migration과 rollback: 신규 컬럼 제거와 trigger 함수 복원으로 rollback 가능. 원본 품목·코드 데이터는 변경하지 않는다.

## 변경 계획

1. 컬럼 추가와 기존 데이터 backfill migration을 작성한다.
2. 품목·제품구분 스냅샷 trigger와 측정회차 스냅샷 trigger를 보완한다.
3. 타입, 목록 검색, 조회와 화면 표시를 스냅샷 컬럼에 연결한다.
4. 참조 중인 이미지 object 보존 검사를 추가한다.
5. lint, typecheck, build 후 원격 dry run·적용·사후 검증을 수행한다.

## 위험과 승인 사항

- 기존 행은 현재 기준정보로만 backfill할 수 있어 실제 과거 값과 다를 수 있다.
- 이미지 object 보존으로 Storage 사용량이 증가할 수 있으며, 미참조 object 정리는 별도 기능이 필요하다.
- 사용자 승인 완료.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 프로덕션 빌드
- [x] migration dry run
- [x] 원격 migration 적용 및 후속 dry run
- [x] 신규/기존 스냅샷 null 검증
- [x] 이미지 참조 보존 분기 검토

## 결과

- 변경: 검사성적서 마스터와 측정 이력의 품목정보 스냅샷을 보완하고 화면 조회를 스냅샷 값에 연결했다. 참조 중인 과거 이미지 object는 교체·연결 해제 시 보존한다.
- 검증: ESLint, TypeScript, production build 통과. 원격 migration 적용 완료, local/remote migration 기록 일치, 후속 dry run `upToDate: true` 확인.
- 미실행: 인증된 브라우저에서 신규 성적서 생성 후 기준정보를 변경하는 종단 간 수동 테스트
- 남은 위험/후속 작업: 기존 행은 migration 시점의 현재 기준정보로 backfill되었다. 참조 보존 이미지의 장기 정리 정책은 별도 작업이 필요하다.
