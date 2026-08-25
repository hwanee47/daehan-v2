export const appTabs = [
  { href: "/inspection-reports", label: "검사성적서" },
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
