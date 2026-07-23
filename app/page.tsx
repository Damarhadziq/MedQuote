import type { Metadata } from "next";
import { MedQuoteApp } from "@/components/medquote-app";

export const metadata: Metadata = {
  title: "MedQuote",
  description: "Kelola produk dan buat penawaran harga obat secara praktis.",
};

export default function Home() {
  return <MedQuoteApp />;
}
