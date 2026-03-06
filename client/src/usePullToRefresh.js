import { useEffect, useRef, useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh, containerRef) {
    const [pulling, setPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startYRef = useRef(null);
    const pullDistRef = useRef(0);
    const THRESHOLD = 70;

    const handleRefresh = useCallback(async () => {
        if (typeof onRefresh === 'function') await onRefresh();
    }, [onRefresh]);

    useEffect(() => {
        const target = containerRef?.current || window;

        const onTouchStart = (e) => {
            const scrollTop = containerRef?.current
                ? containerRef.current.scrollTop
                : window.scrollY;
            if (scrollTop === 0) startYRef.current = e.touches[0].clientY;
        };

        const onTouchMove = (e) => {
            if (startYRef.current === null) return;
            const dist = e.touches[0].clientY - startYRef.current;
            if (dist > 0) {
                pullDistRef.current = Math.min(dist, THRESHOLD * 1.5);
                setPulling(true);
                setPullDistance(pullDistRef.current);
            }
        };

        const onTouchEnd = async () => {
            if (pullDistRef.current >= THRESHOLD) {
                setPullDistance(THRESHOLD);
                await handleRefresh();
            }
            setPulling(false);
            setPullDistance(0);
            pullDistRef.current = 0;
            startYRef.current = null;
        };

        target.addEventListener('touchstart', onTouchStart, { passive: true });
        target.addEventListener('touchmove', onTouchMove, { passive: true });
        target.addEventListener('touchend', onTouchEnd);

        return () => {
            target.removeEventListener('touchstart', onTouchStart);
            target.removeEventListener('touchmove', onTouchMove);
            target.removeEventListener('touchend', onTouchEnd);
        };
    }, [handleRefresh, containerRef]);

    return { pulling, pullDistance, threshold: THRESHOLD };
}
