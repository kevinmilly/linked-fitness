import { Routes } from '@angular/router';
import { authGuard, unauthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [unauthGuard],
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent),
  },
  {
    path: 'today',
    canActivate: [authGuard],
    loadComponent: () => import('./features/today/today.component').then(m => m.TodayComponent),
  },
  {
    path: 'plan',
    canActivate: [authGuard],
    loadComponent: () => import('./features/plan/plan.component').then(m => m.PlanComponent),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () => import('./features/progress/progress.component').then(m => m.ProgressComponent),
  },
  {
    path: 'partner',
    canActivate: [authGuard],
    loadComponent: () => import('./features/partner/partner.component').then(m => m.PartnerComponent),
  },
  {
    path: 'workout/:sessionId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/workout/workout.component').then(m => m.WorkoutComponent),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '', redirectTo: 'today', pathMatch: 'full' },
  { path: '**', redirectTo: 'today' },
];
