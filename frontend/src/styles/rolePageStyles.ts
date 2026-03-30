export const ROLE_PAGE_BACKGROUND_CLASSES = {
  ADMIN: 'bg-slate-50',
  SUPPORT: 'bg-amber-50',
} as const;

const DEFAULT_PAGE_BACKGROUND_CLASS = 'bg-slate-50';

export function getRolePageBackgroundClass(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return ROLE_PAGE_BACKGROUND_CLASSES.ADMIN;
  }

  if (pathname.startsWith('/support')) {
    return ROLE_PAGE_BACKGROUND_CLASSES.SUPPORT;
  }

  return DEFAULT_PAGE_BACKGROUND_CLASS;
}
