import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** Height in pixels (default 8) */
  height?: number;
}

const variantClasses: Record<NonNullable<ProgressProps['variant']>, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, variant = 'default', height = 8, ...props }, ref) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          className,
        )}
        style={{ height: `${height}px` }}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantClasses[variant],
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
