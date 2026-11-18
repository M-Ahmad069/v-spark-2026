"use client";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo, Spinner } from "@/components/ui";
import { saveDriveToken } from "@/lib/client/drive-token";
import { auth, authErrorMessage, googleProvider } from "@/lib/client/firebase";

type Mode = "signin" | "register";

async function startSession() {
  const idToken = await auth.currentUser!.getIdToken(true);
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("session");
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (mode === "register" && name.trim().length < 2) return setError("Enter your name.");
    setBusy("email");
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      await startSession();
      router.replace("/app");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError("");
    setBusy("google");
    try {
      saveDriveToken(await signInWithPopup(auth, googleProvider()));
      await startSession();
      router.replace("/app");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  }

  async function onReset() {
    setError("");
    if (!email.includes("@")) return setError("Type your email above first.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin" ? "Sign in to your caption studio." : "Free, takes ten seconds."}
          </p>

          <button type="button" onClick={onGoogle} disabled={!!busy} className="btn btn-ghost mt-6 w-full">
            {busy === "google" ? <Spinner /> : <GoogleIcon />} Continue with Google
          </button>
          <p className="mt-2 text-center text-xs text-muted">Google sign-in also connects Drive sync.</p>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            {mode === "register" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Name</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} required />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {info && <p role="status" className="text-sm text-ok">{info}</p>}
            <button type="submit" disabled={!!busy} className="btn btn-primary w-full">
              {busy === "email" && <Spinner />} {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-medium text-accent"
              onClick={() => {
                setMode(mode === "signin" ? "register" : "signin");
                setError("");
              }}
            >
              {mode === "signin" ? "Create an account" : "I have an account"}
            </button>
            {mode === "signin" && (
              <button type="button" className="text-muted hover:text-ink" onClick={onReset}>
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
