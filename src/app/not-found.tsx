import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[480px] px-4 py-20 text-center">
      <h1 className="text-[22px] font-extrabold">Not found</h1>
      <Link href="/account" className="mt-6 inline-flex min-h-12 items-center rounded-[14px] bg-primary px-5 font-bold text-on-primary">Account</Link>
    </main>
  );
}
