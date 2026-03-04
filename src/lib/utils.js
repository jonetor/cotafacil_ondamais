import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function formatCurrencyBR(value) {
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
        return 'R$ 0,00';
    }
    return numberValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}