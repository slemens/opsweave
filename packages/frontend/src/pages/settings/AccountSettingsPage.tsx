import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useChangePassword } from '@/api/auth';

// AUDIT-FIX: H-07 — Wire up password change form
export default function AccountSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useAuthStore((s) => s.user);
  const changePasswordMutation = useChangePassword();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleChangePassword() {
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError(t('settings:account.password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings:account.password_mismatch'));
      return;
    }
    if (!currentPassword) {
      setPasswordError(t('settings:account.current_password_required'));
      return;
    }

    changePasswordMutation.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          toast.success(t('settings:account.password_changed'));
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 401 || status === 403) {
            setPasswordError(t('settings:account.wrong_current_password'));
          } else {
            setPasswordError(t('settings:account.password_change_error'));
          }
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:account.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">
              {t('settings:account.display_name')}
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t('settings:account.email')}
            </Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="max-w-md"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button>{t('settings:account.save_profile')}</Button>
        </CardFooter>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings:account.change_password')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              {t('settings:account.current_password')}
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">
              {t('settings:account.new_password')}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">{t('settings:account.password_hint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t('settings:account.confirm_password')}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="max-w-md"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button
            variant="outline"
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          >
            {t('settings:account.save_password')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
