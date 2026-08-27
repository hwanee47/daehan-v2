export const appTabs = [
  { href: "/inspection-reports", label: "성적서 관리" },
  { href: "/inspection-measurements", label: "결과 입력" },
  { href: "/inspection-measurement-history", label: "측정 이력" },
  { href: "/master/items", label: "품목관리" },
  { href: "/master/tolerance-ranges", label: "오차범위관리" },
  { href: "/master/codes", label: "코드관리" },
] as const;

export type AppTabHref = (typeof appTabs)[number]["href"];

export function getAppTab(href: string) {
  return appTabs.find((tab) => tab.href === href);
}

export function isAppTabHref(href: string): href is AppTabHref {
  return getAppTab(href) !== undefined;
}
