// Identity check for protected actions: the person's own email and mobile number, then a 6-digit
// code sent to BOTH their email and WhatsApp at once. Nothing happens until the code is right;
// three wrong attempts close the window and alert the owner.
import { useRef, useState, type ReactNode } from "react";
import { useSessionUser } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/admin/page";
import { findMemberByName, ownerMember } from "@/lib/team-store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const digits = (s: string) => s.replace(/\D/g, "");

interface Req {
  title: string;
  why: string;
  /** "owner" accepts only the owner's details; "self" checks the signed-in person's own. */
  who: "owner" | "self";
  onOk: () => void;
}
const hide = (email: string) =>
  email.replace(
    /^(.)(.*)(@.*)$/,
    (_m, a: string, b: string, c: string) => a + "•".repeat(Math.min(b.length, 4)) + c,
  );

export function useVerify(onBlocked: (title: string, line: string, note?: string) => void) {
  const me = useSessionUser();
  const [req, setReq] = useState<Req | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [errs, setErrs] = useState({ email: "", mobile: "", code: "" });
  const tries = useRef(0);
  const sent = useRef("");

  const person = req ? (req.who === "owner" ? ownerMember() : findMemberByName(me?.name)) : null;
  const close = () => {
    setReq(null);
    setStep(1);
    setEmail("");
    setMobile("");
    setCode("");
    setErrs({ email: "", mobile: "", code: "" });
    tries.current = 0;
  };
  const strike = () => {
    tries.current += 1;
    if (tries.current >= 3) {
      close();
      onBlocked(
        "Blocked",
        "Three wrong attempts. Nothing was changed.",
        "Alert sent to Ramy.Bakr@zelliny.com and WhatsApp.",
      );
      return true;
    }
    return false;
  };
  const sendCode = () => {
    if (!person) return;
    const e = { email: "", mobile: "", code: "" };
    if (email.trim().toLowerCase() !== person.email.toLowerCase()) e.email = "Incorrect email";
    const m = digits(mobile);
    if (!m || !digits(person.mobile).endsWith(m.replace(/^(20|0)+/, "")))
      e.mobile = "Incorrect mobile number";
    if (e.email || e.mobile) {
      setErrs(e);
      strike();
      return;
    }
    sent.current = String(Math.floor(100000 + Math.random() * 900000));
    setStep(2);
  };
  const confirm = () => {
    if (code.trim() !== sent.current) {
      setErrs({ ...errs, code: "Incorrect code" });
      strike();
      return;
    }
    const ok = req!.onOk;
    close();
    ok();
  };

  const node: ReactNode = (
    <Dialog open={!!req} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[460px]">
        <div className="grid justify-items-center gap-1 text-center">
          <span className="mb-2 grid size-11 place-items-center rounded-full bg-muted text-[18px]">
            🔒
          </span>
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">{req?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">{req?.why}</p>
        </div>
        {step === 1 ? (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Your email
              <input
                value={email}
                placeholder="name@zelliny.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrs({ ...errs, email: "" });
                }}
                className={cn(inputCls, errs.email && "border-bad")}
              />
              {errs.email && <span className="text-[12.5px] text-bad">{errs.email}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Your mobile number
              <input
                value={mobile}
                placeholder="01x xxxx xxxx"
                onChange={(e) => {
                  setMobile(e.target.value);
                  setErrs({ ...errs, mobile: "" });
                }}
                className={cn(inputCls, errs.mobile && "border-bad")}
              />
              {errs.mobile && <span className="text-[12.5px] text-bad">{errs.mobile}</span>}
            </label>
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Button primary onClick={sendCode}>
                Send code
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Enter the code
              <span>
                The same code was sent to your email {person ? hide(person.email) : ""} and your
                WhatsApp +20 •• •••• {person ? person.mobile.slice(-4) : ""}. Use whichever you can
                reach. It expires in 5 minutes.
              </span>
              <input
                value={code}
                maxLength={6}
                placeholder="6-digit code"
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrs({ ...errs, code: "" });
                }}
                className={cn(inputCls, "font-mono tracking-[.4em]", errs.code && "border-bad")}
              />
              {errs.code && <span className="text-[12.5px] text-bad">{errs.code}</span>}
              <span>Demo code: {sent.current}</span>
            </label>
            <DialogFooter>
              <Button onClick={close}>Cancel</Button>
              <Button primary onClick={confirm}>
                Confirm
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
  return [
    node,
    (r: Req) => {
      setStep(1);
      setReq(r);
    },
  ] as const;
}
