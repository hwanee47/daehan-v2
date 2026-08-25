# 품목·품목상세 대표 이미지 저장

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

품목마스터와 품목상세에 각각 대표 이미지 한 장을 등록해 품목을 시각적으로 식별할 수 있도록 한다. 파일은 Supabase의 비공개 Storage bucket에 저장하고 DB에는 Storage object path만 기록해 파일과 업무 데이터를 연결한다.

## 범위

### 포함

- `public.items.image_path text null` 추가
- `public.item_details.image_path text null` 추가
- 비공개 Storage bucket `item-images` 생성
- JPEG, PNG, WebP만 허용하고 파일 크기를 5MB로 제한
- authenticated 이미지 조회와 admin 업로드·교체·삭제 Storage RLS
- 품목과 품목상세의 대표 이미지 미리보기·업로드·교체·삭제 Dialog
- 직접 URL과 탭 작업영역에서 동일한 이미지 관리 기능 제공
- 품목·상세 삭제 후 연결된 Storage object 정리
- 비공개 이미지 표시를 위한 signed URL 생성

### 제외

- 품목 또는 품목상세당 여러 이미지
- 이미지 순서, 캡션과 갤러리
- SVG, GIF, 동영상과 문서 파일
- 이미지 편집, 자르기와 자동 썸네일 생성
- 익명 사용자 이미지 조회
- Service Role Key 사용

## 완료 조건

- [x] 품목마스터와 품목상세에 각각 대표 이미지 한 장을 등록할 수 있다.
- [x] 이미지를 교체하거나 삭제할 수 있고 DB path와 Storage object가 일관되게 정리된다.
- [x] JPEG, PNG, WebP 이외 파일과 5MB 초과 파일이 거부된다.
- [x] authenticated 사용자는 이미지를 조회할 수 있고 admin만 변경할 수 있다.
- [x] 비공개 이미지가 signed URL로 표시된다.
- [x] 직접 URL과 탭 작업영역 양쪽에서 이미지 기능이 동작한다.
- [x] 기존 품목·상세 입력, 선택, 분할 반응형과 독립 스크롤이 유지된다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/items/page.tsx`, `actions.ts`, `item-management.tsx`, `types.ts`, `src/app/(app)/workspace-panels.tsx`, `src/app/(app)/layout.tsx`
- 관련 Supabase table/bucket: `public.items`, `public.item_details`, 관리자 판별용 `public.users`; 신규 bucket `item-images`
- 재사용할 기존 패턴: Server Action 관리자 검증, `src/lib/supabase/storage.ts`의 업로드·삭제 helper, Portal Dialog, workspace container 반응형
- 문서와 구현의 차이: README는 Storage 사용 시 bucket과 RLS가 필요하다고 설명하지만 현재 프로젝트에는 실제 bucket migration과 이미지 업무 흐름이 없다.

## 설계

### UI와 반응형

- 모바일: 이미지 Dialog를 viewport 여백 안에서 한 열로 표시하고 preview가 화면 폭을 넘지 않게 한다.
- 태블릿: 업무 패널의 선택된 품목·상세 작업 버튼에서 이미지 Dialog를 연다.
- 데스크톱: 단일·2분할 패널에서 같은 Dialog를 사용하며 Portal로 패널 overflow에 잘리지 않게 한다.
- 로딩/빈 상태/오류/권한: 이미지가 없으면 빈 preview와 안내를 표시하고 업로드·교체·삭제 pending 및 오류를 제공한다. admin 이외에는 기존 품목관리 route 접근 제한을 유지한다.
- 접근성: file input label, 이미지 대체 텍스트, 업로드·삭제 버튼 이름, pending 상태와 오류 live region을 제공한다.

### Server/Client 경계

- Server Component/Action: page와 workspace layout이 `image_path`를 조회하고 private object의 signed URL을 생성한다. 기존 품목·상세 삭제 Server Action은 row 삭제 성공 후 Storage object 정리를 시도한다.
- Client Component/Zustand: `ItemManagement`의 이미지 Dialog와 file preview는 지역 상태를 사용한다. 탭·분할 상태를 Zustand에 추가하지 않는다.
- Route Handler: multipart 이미지 업로드와 이미지 연결 해제를 처리하며 매 요청에서 사용자와 admin role, record 존재, MIME, 확장자와 파일 크기를 검증한다.

### 데이터와 Supabase

- schema 변경: `items.image_path text null`, `item_details.image_path text null`
- PK/FK/index: 기존 PK/FK를 유지한다. 단일 nullable path 조회에는 별도 index를 추가하지 않는다.
- RLS 정책: 기존 table RLS를 유지하고 admin의 `image_path` column update grant를 추가한다. `storage.objects`는 `item-images` bucket에 대해 authenticated select, admin insert/delete만 허용한다.
- Storage bucket/path/policy: private `item-images`, 5MB, `image/jpeg`, `image/png`, `image/webp`; `items/{seq}/{uuid}.{ext}`, `item-details/{seq}/{uuid}.{ext}` 경로만 허용한다.
- migration과 rollback: 재현 가능한 SQL migration으로 컬럼, bucket과 정책을 생성한다. 안전한 rollback은 앱 기능만 되돌리고 nullable 컬럼과 private bucket을 유지한다. 완전 rollback은 object 백업·삭제, path null 처리 후 정책·bucket·컬럼 순서로 제거한다.

## 변경 계획

1. 승인 내용을 기록한 이 작업 문서를 작성한다.
2. 컬럼, column grant, private bucket 설정과 Storage RLS를 포함한 migration SQL을 작성한다.
3. 연결된 원격 `daehan` 프로젝트에 migration dry run을 수행하고 적용 대상을 확인한다.
4. 승인된 migration을 원격 프로젝트에 적용하고 migration 기록 및 후속 dry run을 재확인한다.
5. 이미지 path와 signed URL을 품목·상세 query 및 TypeScript 타입에 연결한다.
6. 관리자 전용 이미지 Route Handler와 업로드·교체·삭제 정리 흐름을 구현한다.
7. 품목·상세 이미지 관리 Dialog와 preview를 직접 URL 및 탭 작업영역에 연결한다.
8. 품목·상세 삭제 시 연결 object를 정리하고 실패는 민감정보 없이 서버 로그에 남긴다.
9. 권한, 파일 검증, 직접 URL·탭·분할 UI, lint, TypeScript와 프로덕션 빌드를 검증한다.

## 위험과 승인 사항

- DB와 Storage는 하나의 transaction으로 묶이지 않으므로 새 object 업로드 → DB path 변경 → 이전 object 삭제 순서와 보상 삭제를 사용한다.
- DB 변경 실패 시 새 object를 제거한다. 이전 object 삭제 실패는 새 이미지 저장을 취소하지 않고 고아 object 후보로 서버 로그에 남긴다.
- row 삭제는 DB 성공을 우선하고 이후 object를 제거한다. Storage 실패 시 삭제된 업무 row를 복구하지 않는다.
- signed URL은 만료되므로 Server render 또는 refresh에서 다시 생성한다.
- 대표 이미지 한 장, private bucket, 5MB, JPEG/PNG/WebP, admin 변경 범위로 승인받았다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase migration dry run, 적용 기록과 후속 dry run
- [x] 프로덕션 빌드

## 결과

- 변경: 품목·품목상세 `image_path`, private `item-images` bucket과 RLS, signed URL 조회, 관리자 업로드·교체·삭제 API와 이미지 관리 Dialog를 구현했다. 품목·상세 row 삭제 후 연결 object도 정리한다.
- 원격 적용: `20260825000000_add_item_images.sql`을 연결된 `daehan` 프로젝트에 dry run 후 적용했고, migration 기록 일치와 후속 dry run의 최신 상태를 확인했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과.
- 미실행: 별도 자동 테스트가 없어 관련 단위·통합 테스트를 실행하지 못했다. 인증된 실제 브라우저 세션을 통한 360px·768px·1280px 시각 확인, 키보드 흐름과 Storage 정책 허용·거부 실사용 테스트는 미실행이다.
- 남은 위험/후속 작업: DB와 Storage는 단일 transaction이 아니므로 이전 object 또는 row 삭제 후 object 정리가 실패하면 서버 로그를 기준으로 고아 object를 정리해야 한다. signed URL은 1시간 후 만료되며 페이지 재조회 시 갱신된다.
