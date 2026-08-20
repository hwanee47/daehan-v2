# 회원가입 페이지 구현

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-20

## 배경과 목적

사용자가 이름, 이메일과 비밀번호로 Supabase Auth 계정을 만들 수 있는 화면을 제공한다.

## 범위

### 포함

- `/signup` 페이지와 회원가입 폼
- Server Action 기반 입력 검증 및 Supabase Auth 가입
- 로딩, 오류 및 이메일 인증 안내 상태

### 제외

- 로그인, 비밀번호 재설정과 소셜 로그인
- DB schema 및 migration 변경

## 완료 조건

- [x] 이름, 이메일, 비밀번호와 비밀번호 확인을 입력할 수 있다.
- [x] 서버에서 입력값을 다시 검증한다.
- [x] Supabase Auth 가입 시 이름을 metadata로 전달한다.
- [x] 로딩, 검증 오류, 서버 오류와 가입 성공 상태를 제공한다.

## 현재 구현 조사

- 관련 route/component: `src/app/page.tsx`, `src/components/layout/container.tsx`, `src/components/ui/button.tsx`
- 관련 Supabase table/bucket: `auth.users`, `public.users`
- 재사용할 기존 패턴: 서버 Supabase client, Container, Button
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 한 열 전체 너비 폼
- 태블릿: 가운데 정렬된 최대 448px 폼
- 데스크톱: 가운데 정렬된 최대 448px 폼
- 로딩/빈 상태/오류/권한: 제출 버튼 로딩, 필드 오류, 일반 오류, 이메일 확인 성공 상태
- 접근성: 연결된 label과 오류 설명, aria live 상태, 44px 이상 조작 영역

### Server/Client 경계

- Server Component/Action: 페이지 metadata와 회원가입 요청·검증
- Client Component/Zustand: `useActionState`를 사용하는 폼만 Client Component

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 기존 정책 사용
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. 회원가입 Server Action을 작성한다.
2. 접근 가능한 반응형 폼과 상태 UI를 작성한다.
3. lint, typecheck, build와 화면을 검증한다.

## 위험과 승인 사항

- 이메일 인증 여부와 메일 발송은 원격 Supabase Auth 설정에 따른다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 관련 단위/통합 테스트
- [x] 모바일 360px
- [x] 태블릿 768px
- [x] 데스크톱 1280px
- [x] 키보드와 접근성
- [x] 프로덕션 빌드

## 결과

- 변경: `/signup` 페이지, 회원가입 Server Action과 상태별 폼 UI 추가
- 검증: ESLint, TypeScript, webpack 프로덕션 빌드 통과. 360/768/1280px 레이아웃과 서버 검증 오류 상태 확인
- 미실행: 실제 이메일을 사용한 원격 회원가입과 인증 메일 수신 테스트
- 남은 위험/후속 작업: 원격 Auth 이메일 인증 설정에 따라 성공 후 문구 또는 이동 경로 조정 가능
