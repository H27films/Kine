export type Page = 'dashboard' | 'weights' | 'cardio' | 'calories' | 'analytics' | 'profile' | 'weights-plus' | 'running-plus';

export type LogTab = 'weights' | 'cardio' | 'calories';

export interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page, data?: any) => void;
}
