"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  useModalDialog,
  type ModalDialogProps,
  type ModalTriggerProps,
} from "@/hooks/useModalDialog";
import { addToCart, removeCartLine, updateCartLine } from "@/lib/cart/actions";
import { addRefusalMessage, canAddToLine } from "@/lib/cart/limits";
import { GENERIC_ERROR } from "@/lib/cart/messages";
import { cartReducer, type NewCartLine } from "@/lib/cart/reducer";
import type { Cart } from "@/types/cart";

/** How long the stepper waits, after the last click, before sending the settled quantity. */
export const QUANTITY_SEND_DELAY_MS = 300;

export interface AddLineResult {
  ok: boolean;
  /** A short, user-facing message. Never an API message. */
  error?: string;
}

export interface CartContextValue {
  /** The cart to display: server state with any in-flight optimistic changes applied. */
  cart: Cart;
  /** True while any cart change is in flight. */
  isPending: boolean;
  /** The last error from a change made inside the drawer. */
  error: string | null;
  dismissError: () => void;
  /** Adds a line, refusing instantly if it would cross the per-line maximum. */
  addLine: (line: NewCartLine) => Promise<AddLineResult>;
  setLineQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  openDrawer: () => void;
  /** For the header button that opens the drawer. */
  triggerProps: ModalTriggerProps;
  /** For the drawer's own `<dialog>`. */
  dialogProps: ModalDialogProps;
  drawerTitleId: string;
  isDrawerOpen: boolean;
  closeDrawer: () => void;
}

/**
 * Logs a Server Action call failing outright — the RPC itself rejecting (a network failure
 * reaching the action at all), not a GraphQL error the action already caught and mapped to
 * `{ ok: false }`. Development-only, matching the rest of the project's error-logging
 * convention; the caller still reports `GENERIC_ERROR` to the user regardless.
 */
function logDevError(message: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(message, error);
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}

/** One line's not-yet-sent quantity change. */
interface PendingSend {
  timer: ReturnType<typeof setTimeout>;
  quantity: number;
  /** Resolves once the debounced send has completed, so callers can keep a transition open. */
  settled: Promise<void>;
  /**
   * Resolves `settled` without sending anything. Used when the line is removed while a
   * quantity change is still queued: the pending change is now moot, but whatever is
   * awaiting `settled` (the `setLineQuantity` transition that scheduled it) still needs to
   * be released, or it hangs forever and `isPending` never clears.
   */
  cancel: () => void;
  /** Performs the send. Re-armed on every further click. */
  fire: () => void;
}

export interface CartProviderProps {
  /**
   * The cart as the server rendered it. Read once: after mount the action return values are
   * authoritative, so later values of this prop are ignored. That is what makes the extra
   * render triggered by the cookie write on the first add harmless rather than load-bearing.
   */
  initialCart: Cart;
  children: ReactNode;
}

/**
 * Holds the cart for the whole app and owns every change to it.
 *
 * Two layers of state. `serverCart` is the truth, and it only advances when an action reports
 * success. `cart` is that value with optimistic changes applied by `cartReducer` — the same
 * pure function the unit tests drive. **Rollback needs no code**: React discards optimistic
 * state when the transition ends, and a failed action leaves `serverCart` untouched, so a
 * network error and a `userErrors` response revert through exactly the same path.
 */
export function CartProvider({ initialCart, children }: CartProviderProps) {
  const [serverCart, setServerCart] = useState(initialCart);
  const [cart, applyOptimistic] = useOptimistic(serverCart, cartReducer);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { dialogProps, triggerProps, titleId, isOpen, close } = useModalDialog();

  const pendingSends = useRef(new Map<string, PendingSend>());

  const dismissError = useCallback(() => setError(null), []);

  const addLine = useCallback(
    async (line: NewCartLine): Promise<AddLineResult> => {
      // Asked before anything is dispatched, so a refusal is instant, costs no request and
      // leaves nothing to roll back (decision 4). The action re-checks against the real cart.
      if (!canAddToLine(cart, line.variantId, line.quantity).ok) {
        return { ok: false, error: addRefusalMessage() };
      }

      let outcome: AddLineResult = { ok: true };

      // The transition stays open until the action settles, which is what keeps the
      // optimistic line on screen for as long as the request is in flight. `done()` runs in
      // `finally`: if `addToCart` itself rejects (the Server Action's RPC failing, not a
      // GraphQL error it already caught and mapped), skipping `done()` would leave this
      // promise — and the transition awaiting it — pending forever.
      await new Promise<void>((done) => {
        startTransition(async () => {
          applyOptimistic({ type: "add", line });

          try {
            const result = await addToCart(line.variantId, line.quantity);
            if (result.ok) {
              startTransition(() => setServerCart(result.cart));
            } else {
              outcome = { ok: false, error: result.error };
            }
          } catch (error) {
            logDevError("Add to cart failed.", error);
            outcome = { ok: false, error: GENERIC_ERROR };
          } finally {
            done();
          }
        });
      });

      return outcome;
    },
    [applyOptimistic, cart],
  );

  /**
   * Schedules the network send for a line, coalescing rapid clicks into one mutation.
   *
   * Returns a promise that resolves only when the send has finished. Callers await it inside
   * their transition, because optimistic state lives exactly as long as the transition does:
   * without this, a click would paint the new quantity, the transition would end immediately,
   * and the number would snap back to the old value until the request landed 300ms later.
   */
  const scheduleSend = useCallback((lineId: string, quantity: number): Promise<void> => {
    const pending = pendingSends.current.get(lineId);

    if (pending) {
      // A later click replaces the value and restarts the clock; everyone waits on one send.
      clearTimeout(pending.timer);
      pending.quantity = quantity;
      pending.timer = setTimeout(pending.fire, QUANTITY_SEND_DELAY_MS);
      return pending.settled;
    }

    let fire!: () => void;
    let cancel!: () => void;
    const settled = new Promise<void>((resolve) => {
      cancel = resolve;
      fire = () => {
        const entry = pendingSends.current.get(lineId);
        pendingSends.current.delete(lineId);

        void (async () => {
          try {
            const result = await updateCartLine(lineId, entry?.quantity ?? quantity);
            if (result.ok) {
              startTransition(() => setServerCart(result.cart));
            } else {
              setError(result.error);
            }
          } catch (error) {
            // The Server Action's own try/catch covers the GraphQL call; this one covers the
            // RPC itself failing. Either way the caller gets a message and `settled` still
            // resolves.
            logDevError("Cart quantity update failed.", error);
            setError(GENERIC_ERROR);
          } finally {
            resolve();
          }
        })();
      };
    });

    pendingSends.current.set(lineId, {
      timer: setTimeout(fire, QUANTITY_SEND_DELAY_MS),
      quantity,
      settled,
      cancel,
      fire,
    });

    return settled;
  }, []);

  const setLineQuantity = useCallback(
    (lineId: string, quantity: number) => {
      setError(null);
      startTransition(async () => {
        // Immediate, on every click.
        applyOptimistic({ type: "setQuantity", lineId, quantity });
        await scheduleSend(lineId, quantity);
      });
    },
    [applyOptimistic, scheduleSend],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      setError(null);
      // A queued quantity change for a line being removed would race the removal. Cancelling
      // it (rather than just clearing the timer) resolves the `settled` promise the earlier
      // `setLineQuantity` transition is awaiting — without this, that transition never
      // finishes, `isPending` never clears, and the next attempted change silently stalls
      // behind it.
      const pending = pendingSends.current.get(lineId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingSends.current.delete(lineId);
        pending.cancel();
      }

      startTransition(async () => {
        applyOptimistic({ type: "remove", lineId });

        try {
          const result = await removeCartLine(lineId);
          if (result.ok) {
            startTransition(() => setServerCart(result.cart));
          } else {
            setError(result.error);
          }
        } catch (error) {
          logDevError("Cart line removal failed.", error);
          setError(GENERIC_ERROR);
        }
      });
    },
    [applyOptimistic],
  );

  const openDrawer = triggerProps.onClick;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isPending,
      error,
      dismissError,
      addLine,
      setLineQuantity,
      removeLine,
      openDrawer,
      triggerProps,
      dialogProps,
      drawerTitleId: titleId,
      isDrawerOpen: isOpen,
      closeDrawer: close,
    }),
    [
      cart,
      isPending,
      error,
      dismissError,
      addLine,
      setLineQuantity,
      removeLine,
      openDrawer,
      triggerProps,
      dialogProps,
      titleId,
      isOpen,
      close,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
