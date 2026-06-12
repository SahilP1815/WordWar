import { useEffect, useRef, useState, useCallback } from 'react';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    // Use current host, switch protocol
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // For Vercel production, we will set VITE_WS_URL. Otherwise default to local proxy.
    const wsUrl = import.meta.env.VITE_WS_URL || `${proto}//${host}/ws`;

    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established.');
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Dispatch custom event to handle inside page components
        setLastMessage(data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
      setConnected(false);
      socketRef.current = null;
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };

    socketRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const send = useCallback((type, payload = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Socket not open. Message not sent:', type);
      return false;
    }
    socketRef.current.send(JSON.stringify({ type, ...payload }));
    return true;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    lastMessage,
    messages,
    send,
    error,
    clearMessages: () => setMessages([]),
  };
}
