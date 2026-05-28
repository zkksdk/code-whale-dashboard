import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const { setWsConnected, setWsClientCount, setSystemStatus } = useStore();
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    
    // Clean up any existing connection
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      let openFired = false;

      ws.onopen = () => {
        if (!mountedRef.current) { try { ws.close(); } catch {}; return; }
        openFired = true;
        reconnectAttempts.current = 0;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'connected':
              setWsClientCount(data.data.clientCount);
              break;
            case 'client_count':
              setWsClientCount(data.data.count);
              break;
            case 'status_change':
              setSystemStatus(data.data);
              break;
            case 'pong':
              break;
            default:
              window.dispatchEvent(new CustomEvent('ws-message', { detail: data }));
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;
        if (openFired) setWsConnected(false);
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), maxReconnectDelay);
        reconnectAttempts.current++;
        reconnectTimeout.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this, no need to handle separately
      };
    } catch (e) {
      // Retry on construction error
      if (mountedRef.current) {
        reconnectTimeout.current = setTimeout(() => connect(), 3000);
      }
    }
  }, [url, setWsConnected, setWsClientCount, setSystemStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
