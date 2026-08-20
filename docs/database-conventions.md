# 데이터베이스 작성 규칙

## 모든 테이블의 공통 감사 컬럼

앞으로 생성하는 모든 애플리케이션 테이블에는 아래 컬럼을 기본으로 포함한다.

| 컬럼 | 권장 타입 | 규칙 |
| --- | --- | --- |
| `created_at` | `timestamptz` | 생성 일시. `not null default now()` |
| `created_by` | `uuid` | 생성자. 가능하면 `auth.users(id)` FK와 `on delete set null` 적용 |
| `updated_at` | `timestamptz` | 수정 일시. `not null default now()` 및 수정 trigger 적용 |
| `updated_by` | `uuid` | 수정자. 가능하면 `auth.users(id)` FK와 `on delete set null` 적용 |

- 애플리케이션 사용자가 소유하는 데이터는 `created_by`, `updated_by`를 `auth.uid()`로 기록한다.
- 시스템 작업처럼 인증 사용자가 없는 변경은 `null`을 허용하며, 필요하면 별도의 시스템 주체 식별 방식을 설계한다.
- 공통 trigger 함수 `public.set_audit_fields()`를 재사용한다. 함수가 아직 없는 초기 migration에서는 함수도 함께 생성한다.
- RLS 정책은 감사 컬럼만 믿지 않고, 테이블의 실제 소유자 컬럼과 업무 규칙을 기준으로 작성한다.
- 예외가 필요한 테이블은 migration과 작업 문서에 이유를 기록한다.

## 사용자와 비밀번호

- 사용자 인증 ID와 비밀번호는 Supabase Auth의 `auth.users`가 관리한다.
- `public` schema의 테이블에는 평문 비밀번호, 비밀번호 해시 또는 `pw` 컬럼을 만들지 않는다.
- 애플리케이션 사용자 정보는 `public.users.id`를 `auth.users(id)`에 PK/FK로 연결해 관리한다.
- `public.users.email`은 애플리케이션 조회를 위한 복제본이며 Auth 이메일 변경 trigger로 동기화한다. 클라이언트가 직접 변경하지 못하게 한다.
