# 품목 이미지 전체 화면 미리보기

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

품목과 품목상세의 이미지 관리 Dialog에 표시되는 작은 미리보기만으로는 이미지 세부 내용을 확인하기 어렵다. 등록된 이미지 또는 업로드 전 선택한 이미지를 눌러 화면 전체 크기의 미리보기로 확인하고 원래 이미지 관리 흐름으로 쉽게 돌아올 수 있게 한다.

## 범위

### 포함

- 이미지가 있을 때 미리보기 영역을 전체 화면 보기 버튼으로 제공
- viewport 전체를 덮는 어두운 배경과 `object-contain` 방식의 원본 비율 이미지 표시
- 우측 상단 닫기 버튼, 배경 클릭과 Escape 키로 전체 화면 미리보기만 닫기
- 전체 화면 진입 버튼의 hover, focus-visible과 접근 가능한 이름 제공
- 등록된 signed URL 이미지와 업로드 전 로컬 preview 양쪽 지원
- 직접 URL과 탭 작업영역, 단일·2분할 화면에서 동일하게 동작

### 제외

- 브라우저 Fullscreen API를 통한 운영체제 수준 전체 화면
- 확대·축소, 회전, 이동, 다운로드와 여러 이미지 탐색
- Supabase schema, bucket, RLS, signed URL 정책 변경

## 완료 조건

- [x] 이미지가 있는 미리보기를 클릭하거나 키보드로 실행하면 viewport 전체 미리보기가 열린다.
- [x] 이미지가 화면을 넘지 않고 원본 비율로 최대 크기 표시된다.
- [x] 닫기 버튼, 배경 클릭과 Escape 키로 전체 화면 미리보기만 닫힌다.
- [x] 닫은 뒤 전체 화면 보기 버튼으로 focus가 복귀한다.
- [x] 등록 이미지와 업로드 전 선택 이미지에 모두 적용된다.
- [x] 직접 URL과 탭 작업영역, 단일·2분할 화면에서 동일하게 동작한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/items/item-management.tsx`의 `ImageManagerDialog`, 공통 `DialogFrame`
- 관련 Supabase table/bucket: 기존 `items.image_path`, `item_details.image_path`, private `item-images`를 그대로 사용하며 변경하지 않는다.
- 재사용할 기존 패턴: `@base-ui/react/dialog` Portal, 기존 signed URL 및 로컬 object URL preview, shadcn `Button`
- 문서와 구현의 차이: 현재 미리보기는 `role="img"`인 배경 이미지 영역이며 전체 화면 보기 동작과 키보드 진입점이 없다.

## 설계

### UI와 반응형

- 모바일: 화면 전체 overlay 안에서 안전 여백을 두고 이미지를 `max-width`·`max-height` 범위에 맞춰 표시한다.
- 태블릿: 같은 viewport overlay를 사용하며 이미지 비율을 유지한다.
- 데스크톱: 이미지 관리 Dialog와 작업 패널보다 위에 표시하고 큰 이미지도 viewport 안에 맞춘다.
- 로딩/빈 상태/오류/권한: 현재 표시 가능한 URL이 있을 때만 전체 화면 버튼을 활성화한다. 기존 signed URL 오류와 권한 흐름은 변경하지 않는다.
- 접근성: 실제 `button`으로 진입하고 Dialog 제목·설명을 제공한다. Escape, focus trap과 닫은 뒤 focus 복귀는 Dialog primitive를 사용한다.

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: `ImageManagerDialog` 내부의 지역 boolean 상태만 추가하며 전역 store에는 저장하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음. 기존 이미지 URL을 표시만 한다.
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음. UI 변경 파일을 되돌리면 된다.

## 변경 계획

1. 이미지 미리보기 영역을 전체 화면 보기 `button`으로 변경한다.
2. 기존 이미지 관리 Dialog 위에 표시되는 전체 화면 이미지 Dialog를 추가한다.
3. 원본 비율, viewport 안전 여백, 닫기 버튼과 focus 스타일을 적용한다.
4. 직접 URL·탭·분할 화면 및 키보드 흐름을 검증한다.
5. lint, TypeScript와 프로덕션 빌드를 실행한다.

## 위험과 승인 사항

- 이 제안의 “전체 화면”은 브라우저 창의 viewport를 덮는 이미지 overlay를 뜻한다. 브라우저 자체 UI까지 숨기는 Fullscreen API는 사용하지 않는다.
- 이미지 관리 Dialog 위에 중첩 Dialog가 열리므로 Escape와 focus 복귀가 상위 Dialog까지 닫지 않는지 검증한다.
- DB, Supabase Storage와 권한 정책 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책 — 해당 없음, 데이터 계층 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 이미지 미리보기를 접근 가능한 전체 화면 보기 버튼으로 변경하고, viewport overlay와 원본 비율 표시, 닫기 버튼·배경 클릭·Escape 및 focus 복귀를 추가했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과.
- 미실행: 별도 자동 테스트가 없어 단위·통합 테스트를 실행하지 못했다. 인증된 실제 브라우저 세션에서 360px·768px·1280px 시각 확인과 키보드 흐름은 미실행이다.
- 남은 위험/후속 작업: 실제 브라우저에서 중첩 Dialog의 Escape 및 배경 클릭이 상위 이미지 관리 Dialog까지 닫지 않는지 최종 확인이 필요하다.
