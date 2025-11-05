import { useRef, useEffect } from 'react';

/**
 * Hook to track if a function reference changes between renders.
 * Useful for testing if useCallback is working correctly.
 * 
 * @param fn - The function to track
 * @param label - Optional label for console output
 * @returns The same function passed in (pass-through)
 */
export function useFunctionRenderTracker<T extends (...args: any[]) => any>(
  fn: T,
  label: string = 'Function'
): T {
  const prevFnRef = useRef<T | null>(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    
    if (prevFnRef.current === null) {
      // First render
      console.log(`[${label}] First render - Function created`);
    } else if (prevFnRef.current !== fn) {
      // Function reference changed
      console.warn(
        `⚠️ [${label}] Function reference CHANGED on render #${renderCountRef.current}`,
        {
          previous: prevFnRef.current,
          current: fn,
        }
      );
    } else {
      // Function reference is the same (useCallback working!)
      console.log(
        `✅ [${label}] Function reference STABLE on render #${renderCountRef.current}`
      );
    }
    
    prevFnRef.current = fn;
  });

  return fn;
}

/**
 * Simple version that just logs when a function changes
 */
export function useFunctionChangeTracker<T extends (...args: any[]) => any>(
  fn: T,
  label: string = 'Function'
): void {
  const prevFnRef = useRef<T | null>(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    
    if (prevFnRef.current !== null && prevFnRef.current !== fn) {
      console.warn(`⚠️ [${label}] Changed on render #${renderCountRef.current}`);
    } else if (prevFnRef.current === fn && renderCountRef.current > 1) {
      console.log(`✅ [${label}] Stable on render #${renderCountRef.current}`);
    }
    
    prevFnRef.current = fn;
  });
}
