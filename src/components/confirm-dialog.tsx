import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  /** Names the action, e.g. "Delete vendor". Never just "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = ConfirmOptions & {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

type Request =
  | ({ kind: "confirm" } & ConfirmOptions & { resolve: (ok: boolean) => void })
  | ({ kind: "prompt" } & PromptOptions & { resolve: (value: string | null) => void });

const Ctx = createContext<{
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  prompt: (o: PromptOptions) => Promise<string | null>;
} | null>(null);

/** Mount once near the root. Replaces window.confirm / window.prompt app-wide. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const settled = useRef(false);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        settled.current = false;
        setRequest({ kind: "confirm", ...o, resolve });
      }),
    [],
  );
  const prompt = useCallback(
    (o: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        settled.current = false;
        setValue(o.defaultValue ?? "");
        setRequest({ kind: "prompt", ...o, resolve });
      }),
    [],
  );

  const finish = (accepted: boolean) => {
    if (!request || settled.current) return;
    settled.current = true;
    if (request.kind === "confirm") request.resolve(accepted);
    else request.resolve(accepted ? value.trim() : null);
    setRequest(null);
  };

  const blocked = request?.kind === "prompt" && request.required && !value.trim();

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog open={request !== null} onOpenChange={(open) => !open && finish(false)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!blocked) finish(true);
            }}
            className="space-y-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{request?.title}</AlertDialogTitle>
              {request?.description ? <AlertDialogDescription>{request.description}</AlertDialogDescription> : null}
            </AlertDialogHeader>
            {request?.kind === "prompt" ? (
              <div className="space-y-2">
                <Label htmlFor="prompt-value">{request.label}</Label>
                <Textarea
                  id="prompt-value"
                  autoFocus
                  value={value}
                  placeholder={request.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  rows={3}
                />
              </div>
            ) : null}
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel type="button">{request?.cancelLabel ?? "Cancel"}</AlertDialogCancel>
              <Button type="submit" variant={request?.destructive ? "destructive" : "default"} disabled={blocked}>
                {request?.confirmLabel}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

function useDialogs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm/usePrompt need <ConfirmProvider> above them.");
  return ctx;
}

/** `if (await confirm({ title, confirmLabel, destructive: true })) …` */
export const useConfirm = () => useDialogs().confirm;
/** Resolves to the trimmed text, or null if cancelled. */
export const usePrompt = () => useDialogs().prompt;
