export type Page = 'dashboard' | 'weights' | 'cardio' | 'calories' | 'analytics' | 'profile' | 'summary';

export type LogTab = 'weights' | 'cardio' | 'calories';

export interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}
