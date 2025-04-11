import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AccountSwitcher({ isCollapsed }) {
  const { logout, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed in AccountSwitcher:', error);
    }
  };

  const getInitials = (name = '') => {
    const names = name.split(' ');
    if (names.length === 0 || names[0] === '') return '?';
    if (names.length === 1) return names[0][0].toUpperCase();
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  };

  console.log(userProfile);

  return (
    <div className={`flex items-center gap-2 w-full ${isCollapsed ? 'justify-center' : 'px-2'}`}>
      {!isCollapsed && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={userProfile?.picture}
            alt={userProfile?.name || 'User Avatar'}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
        </Avatar>
      )}

      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{userProfile?.email || 'Loading...'}</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className={isCollapsed ? '' : 'ml-auto'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-log-out"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
        <span className="sr-only">Logout</span>
      </Button>
    </div>
  );
}
