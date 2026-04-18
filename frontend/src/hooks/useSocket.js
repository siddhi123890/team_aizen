import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://team-aizen-3.onrender.com';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [lastFraudAlert, setLastFraudAlert] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Establish connection
    socketRef.current = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔗 Connected to FraudShield WebSocket');
      setIsConnected(true);

      // Subscribe to necessary channels
      socket.emit('subscribe_transactions');
      socket.emit('subscribe_alerts');
    });

    socket.on('disconnect', () => {
      console.warn('⚠️ Disconnected from WebSocket');
      setIsConnected(false);
    });

    // Real-time Event Listeners
    socket.on('new_transaction', (tx) => {
      setLastTransaction(tx);
    });

    socket.on('fraud_detected', (alert) => {
      setLastFraudAlert(alert);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    isConnected,
    lastTransaction,
    lastFraudAlert,
  };
}
