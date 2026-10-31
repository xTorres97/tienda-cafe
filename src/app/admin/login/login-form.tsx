"use client";

import { startTransition, useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "../actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next, demo }: { next: string; demo?: { email: string; password: string } }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const form = useRef<HTMLFormElement>(null);
  const field = "h-12 w-full rounded-2xl border border-forest/20 bg-surface px-4 focus:border-forest focus:outline-none";

  return (
    <form ref={form} className="space-y-4" onSubmit={e => {
      // Envío manual para que un error no borre el email escrito
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => action(fd));
    }}>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={field} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-bucare-dark">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" variant="forest" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}Entrar
      </Button>
      {demo && (
        <button type="button" className="w-full rounded-full border border-dashed border-forest/30 py-3 text-sm font-semibold hover:border-forest"
          onClick={() => {
            const f = form.current!;
            (f.elements.namedItem("email") as HTMLInputElement).value = demo.email;
            (f.elements.namedItem("password") as HTMLInputElement).value = demo.password;
            f.requestSubmit();
          }}>
          Entrar con la cuenta de demostración
        </button>
      )}
    </form>
  );
}
