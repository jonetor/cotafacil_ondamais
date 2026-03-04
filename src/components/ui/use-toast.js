import { useEffect, useState } from "react";

const TOAST_LIMIT = 1;

let count = 0;
function generateId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastStore = {
  state: { toasts: [] },
  listeners: [],

  getState: () => toastStore.state,

  setState: (nextState) => {
    if (typeof nextState === "function") {
      toastStore.state = nextState(toastStore.state);
    } else {
      toastStore.state = { ...toastStore.state, ...nextState };
    }
    toastStore.listeners.forEach((listener) => listener(toastStore.state));
  },

  subscribe: (listener) => {
    toastStore.listeners.push(listener);
    return () => {
      toastStore.listeners = toastStore.listeners.filter((l) => l !== listener);
    };
  },
};

function dismissToast(id) {
  toastStore.setState((state) => ({
    ...state,
    toasts: state.toasts.filter((t) => t.id !== id),
  }));
}

export const toast = ({ ...props }) => {
  const id = generateId();

  const update = (patch) =>
    toastStore.setState((state) => ({
      ...state,
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const dismiss = () => dismissToast(id);

  // ✅ IMPORTANT: não guardar funções (dismiss) no objeto do toast
  toastStore.setState((state) => ({
    ...state,
    toasts: [{ ...props, id }, ...state.toasts].slice(0, TOAST_LIMIT),
  }));

  return { id, dismiss, update };
};

export function useToast() {
  const [state, setState] = useState(toastStore.getState());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((s) => setState(s));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timeouts = [];

    state.toasts.forEach((t) => {
      if (t.duration === Infinity) return;

      const timeout = setTimeout(() => {
        dismissToast(t.id);
      }, t.duration || 5000);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [state.toasts]);

  return {
    toast,
    toasts: state.toasts,
  };
}