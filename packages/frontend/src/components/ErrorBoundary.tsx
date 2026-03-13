import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Translation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  detailsOpen: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      detailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Future: send to error reporting service
    void error;
  }

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, detailsOpen } = this.state;

    return (
      <Translation ns="common">
        {(t) => (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {t('error_boundary.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('error_boundary.description')}
                  </p>
                </div>

                <Button onClick={this.handleReload} className="mt-2">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('error_boundary.reload')}
                </Button>

                {/* Error details expander (for debugging) */}
                {error && (
                  <div className="w-full mt-2">
                    <button
                      onClick={this.toggleDetails}
                      className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('error_boundary.details')}
                      {detailsOpen
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {detailsOpen && (
                      <div className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-xs font-mono text-muted-foreground">
                        <p className="font-semibold text-destructive mb-1">
                          {error.name}: {error.message}
                        </p>
                        {errorInfo?.componentStack && (
                          <pre className="whitespace-pre-wrap break-words">
                            {errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Translation>
    );
  }
}
