import { useEffect } from 'react';
let lockCount = 0;
let originalBodyOverflow = '';
let originalDocOverflow = '';
let originalPaddingRight = '';
export function useBodyScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (!isLocked)
            return;
        if (lockCount === 0) {
            originalBodyOverflow = document.body.style.overflow;
            originalDocOverflow = document.documentElement.style.overflow;
            originalPaddingRight = document.body.style.paddingRight;
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollBarWidth > 0) {
                document.body.style.paddingRight = `${scrollBarWidth}px`;
            }
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }
        lockCount++;
        return () => {
            lockCount--;
            if (lockCount <= 0) {
                lockCount = 0;
                document.body.style.overflow = originalBodyOverflow || '';
                document.documentElement.style.overflow = originalDocOverflow || '';
                document.body.style.paddingRight = originalPaddingRight || '';
            }
        };
    }, [isLocked]);
}
